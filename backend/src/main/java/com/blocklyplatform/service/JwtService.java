package com.blocklyplatform.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expiryMillis;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiry-hours}") int expiryHours) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMillis = (long) expiryHours * 3600 * 1000;
    }

    public String generateToken(String username, String role, int tokenVersion) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiryMillis);
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .claim("tokenVersion", tokenVersion)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {
        return validateToken(token).getSubject();
    }

    public int extractTokenVersion(String token) {
        Claims claims = validateToken(token);
        Object tv = claims.get("tokenVersion");
        if (tv instanceof Number) {
            return ((Number) tv).intValue();
        }
        return 0;
    }
}
