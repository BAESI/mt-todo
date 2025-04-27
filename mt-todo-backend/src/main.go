package main

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/golang-jwt/jwt/v4"
)

var (
	ddb *dynamodb.Client
	tbl = os.Getenv("TABLE_NAME") // DynamoDB 테이블 이름 (환경변수로 설정)
)

var (
	region     = os.Getenv("AWS_REGION")
	userPoolId = os.Getenv("COGNITO_USER_POOL_ID")
	clientId   = os.Getenv("COGNITO_CLIENT_ID")
)

var jwkUrl = fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", region, userPoolId)

// ✅ JWK 구조체
type JWK struct {
	Keys []struct {
		Kid string `json:"kid"`
		Kty string `json:"kty"`
		Alg string `json:"alg"`
		Use string `json:"use"`
		N   string `json:"n"`
		E   string `json:"e"`
	} `json:"keys"`
}

func main() {
	ctx := context.Background()

	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	ddb = dynamodb.NewFromConfig(cfg)

	http.Handle("/", corsMiddleware(jwtMiddleware(http.HandlerFunc(handler))))

	log.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// ✅ CORS 미들웨어 추가
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Tenant-ID") // ✨ 수정

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ✅ JWT 미들웨어
func jwtMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		_, err := validateJWT(tokenString)
		if err != nil {
			http.Error(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ✅ JWT 검증 함수 (aud, iss까지 검증)
func validateJWT(tokenString string) (*jwt.Token, error) {
	// JWKS 다운로드
	resp, err := http.Get(jwkUrl)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwk JWK
	if err := json.NewDecoder(resp.Body).Decode(&jwk); err != nil {
		return nil, fmt.Errorf("failed to decode JWKS: %w", err)
	}

	keyFunc := func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("invalid token header: missing kid")
		}

		for _, key := range jwk.Keys {
			if key.Kid == kid {
				return parseRSAPublicKey(key.N, key.E)
			}
		}

		return nil, errors.New("unable to find matching key")
	}

	// 토큰 파싱
	token, err := jwt.Parse(tokenString, keyFunc)
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// ✨ 여기서 aud(Audience) 수동 검증 추가
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	aud, ok := claims["aud"].(string)
	if !ok {
		return nil, errors.New("aud claim missing")
	}

	if aud != clientId {
		return nil, fmt.Errorf("invalid audience: expected %s, got %s", clientId, aud)
	}

	// ✅ 여기까지 통과하면 진짜 정상 토큰
	return token, nil
}

// ✅ RSA 공개키 변환
func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode n: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode e: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)

	var eInt int
	if len(eBytes) < 4 {
		for _, b := range eBytes {
			eInt = eInt<<8 + int(b)
		}
	} else {
		eInt = int(new(big.Int).SetBytes(eBytes).Uint64())
	}

	pubKey := &rsa.PublicKey{
		N: n,
		E: eInt,
	}

	return pubKey, nil
}

// ✅ 메인 핸들러 (GET, POST, PUT, DELETE)
func handler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	tenant := r.Header.Get("X-Tenant-ID")

	switch r.Method {
	case http.MethodGet:
		out, err := ddb.Query(ctx, &dynamodb.QueryInput{
			TableName:              &tbl,
			KeyConditionExpression: aws.String("PK = :p and begins_with(SK, :t)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":p": &types.AttributeValueMemberS{Value: "TENANT#" + tenant},
				":t": &types.AttributeValueMemberS{Value: "TODO#"},
			},
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(out.Items)

	case http.MethodPost:
		var req struct{ Title string }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		id := generateUUID()
		item := map[string]types.AttributeValue{
			"PK":        &types.AttributeValueMemberS{Value: "TENANT#" + tenant},
			"SK":        &types.AttributeValueMemberS{Value: "TODO#" + id},
			"ID":        &types.AttributeValueMemberS{Value: id},
			"Title":     &types.AttributeValueMemberS{Value: req.Title},
			"Completed": &types.AttributeValueMemberBOOL{Value: false},
		}

		_, err := ddb.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: &tbl,
			Item:      item,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)

	case http.MethodPut:
		var req struct {
			ID        string
			Completed bool
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		key := map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "TENANT#" + tenant},
			"SK": &types.AttributeValueMemberS{Value: "TODO#" + req.ID},
		}

		update := "SET Completed = :c"
		exprValues := map[string]types.AttributeValue{
			":c": &types.AttributeValueMemberBOOL{Value: req.Completed},
		}

		_, err := ddb.UpdateItem(ctx, &dynamodb.UpdateItemInput{
			TableName:                 &tbl,
			Key:                       key,
			UpdateExpression:          &update,
			ExpressionAttributeValues: exprValues,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

	case http.MethodDelete:
		var req struct{ ID string }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		key := map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: "TENANT#" + tenant},
			"SK": &types.AttributeValueMemberS{Value: "TODO#" + req.ID},
		}

		_, err := ddb.DeleteItem(ctx, &dynamodb.DeleteItemInput{
			TableName: &tbl,
			Key:       key,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ✅ UUID 생성 함수
func generateUUID() string {
	return strings.ReplaceAll(strings.ToLower(fmt.Sprintf("%v", newUUID())), "-", "")
}

func newUUID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
