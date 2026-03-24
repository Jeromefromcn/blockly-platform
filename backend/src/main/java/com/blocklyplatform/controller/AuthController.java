package com.blocklyplatform.controller;

import com.blocklyplatform.service.AuthService;
import com.blocklyplatform.service.JwtService;
import com.blocklyplatform.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        try {
            String token = authService.login(username, password);

            Cookie cookie = new Cookie("auth_token", token);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(8 * 3600);
            response.addCookie(cookie);

            // Extract role from the issued token
            Claims claims = jwtService.validateToken(token);
            String resolvedUsername = claims.getSubject();
            String role = claims.get("role", String.class);
            List<String> permissions = userService.getPermissions(role);

            return ResponseEntity.ok(Map.of(
                    "username", resolvedUsername,
                    "role", role,
                    "permissions", permissions
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("auth_token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String username = (String) auth.getPrincipal();
        String role = auth.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");

        List<String> permissions = userService.getPermissions(role);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("username", username);
        result.put("role", role);
        result.put("permissions", permissions);

        // Add profile info for DB users
        if (!"SUPER_ADMIN".equals(role)) {
            userService.listUsers().stream()
                    .filter(u -> username.equals(u.get("username")))
                    .findFirst()
                    .ifPresent(u -> {
                        result.put("displayName", u.get("displayName"));
                        result.put("email", u.get("email"));
                        result.put("id", u.get("id"));
                    });
        }

        return ResponseEntity.ok(result);
    }
}
