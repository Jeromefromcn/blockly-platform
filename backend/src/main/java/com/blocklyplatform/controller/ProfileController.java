package com.blocklyplatform.controller;

import com.blocklyplatform.service.AuthService;
import com.blocklyplatform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (String) auth.getPrincipal();

        if (authService.isSuperAdmin(username)) {
            return ResponseEntity.ok(Map.of(
                    "username", username,
                    "role", "SUPER_ADMIN",
                    "displayName", "Super Admin",
                    "email", ""
            ));
        }

        return userService.listUsers().stream()
                .filter(u -> username.equals(u.get("username")))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (String) auth.getPrincipal();

        if (authService.isSuperAdmin(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Super admin profile cannot be updated"));
        }

        return userService.listUsers().stream()
                .filter(u -> username.equals(u.get("username")))
                .findFirst()
                .map(u -> {
                    Long id = ((Number) u.get("id")).longValue();
                    return ResponseEntity.ok(userService.updateProfile(id, body.get("displayName"), body.get("email")));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (String) auth.getPrincipal();

        if (authService.isSuperAdmin(username)) {
            return ResponseEntity.status(403).body(Map.of("error", "Super admin cannot change password via this endpoint"));
        }

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "oldPassword and newPassword are required"));
        }

        return userService.listUsers().stream()
                .filter(u -> username.equals(u.get("username")))
                .findFirst()
                .map(u -> {
                    Long id = ((Number) u.get("id")).longValue();
                    try {
                        userService.changePassword(id, oldPassword, newPassword);
                        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
                    } catch (Exception e) {
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
