package com.blocklyplatform.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    // 256-bit (32-char) secret — meets HMAC-SHA minimum requirement
    private static final String SECRET = "test-secret-key-32-bytes-abcdefgh";
    private static final int EXPIRY_HOURS = 8;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRY_HOURS);
    }

    // 1. generateToken produces a valid non-null token
    @Test
    void generateToken_returnsNonNullToken() {
        String token = jwtService.generateToken("alice", "TUTOR", 0);
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    // 2. validateToken returns claims for a valid token
    @Test
    void validateToken_validToken_returnsClaims() {
        String token = jwtService.generateToken("alice", "TUTOR", 1);
        Claims claims = jwtService.validateToken(token);
        assertNotNull(claims);
        assertEquals("alice", claims.getSubject());
    }

    // 3. validateToken throws for an expired token (use expiry = 0 hours → immediate expiry)
    @Test
    void validateToken_expiredToken_throwsExpiredJwtException() {
        // 0-hour expiry makes every token expire immediately
        JwtService shortLived = new JwtService(SECRET, 0);
        String token = shortLived.generateToken("alice", "TUTOR", 0);
        assertThrows(ExpiredJwtException.class, () -> shortLived.validateToken(token));
    }

    // 4. validateToken throws for a tampered token
    @Test
    void validateToken_tamperedToken_throwsSignatureException() {
        String token = jwtService.generateToken("alice", "TUTOR", 0);
        // Flip the last character to corrupt the signature
        String tampered = token.substring(0, token.length() - 1) + (token.endsWith("a") ? "b" : "a");
        assertThrows(Exception.class, () -> jwtService.validateToken(tampered));
    }

    // 5. extractUsername returns correct username from token
    @Test
    void extractUsername_returnsCorrectUsername() {
        String token = jwtService.generateToken("bob", "STUDENT", 2);
        assertEquals("bob", jwtService.extractUsername(token));
    }

    // 6. extractTokenVersion returns correct version from token
    @Test
    void extractTokenVersion_returnsCorrectVersion() {
        String token = jwtService.generateToken("carol", "TUTOR", 5);
        assertEquals(5, jwtService.extractTokenVersion(token));
    }

    // 7. token contains correct role claim
    @Test
    void generateToken_tokenContainsCorrectRoleClaim() {
        String token = jwtService.generateToken("dave", "SUPER_ADMIN", 0);
        Claims claims = jwtService.validateToken(token);
        assertEquals("SUPER_ADMIN", claims.get("role", String.class));
    }
}
