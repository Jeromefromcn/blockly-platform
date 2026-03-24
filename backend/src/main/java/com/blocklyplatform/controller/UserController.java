package com.blocklyplatform.controller;

import com.blocklyplatform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<?> listUsers() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        try {
            Map<String, Object> user = userService.createUser(
                    body.get("username"),
                    body.get("password"),
                    body.get("role"),
                    body.get("displayName"),
                    body.get("email")
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.resetPassword(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{id}/force-logout")
    public ResponseEntity<?> forceLogout(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.forceLogout(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/import-csv")
    public ResponseEntity<?> importCsv(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(userService.importCsv(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/permissions/{role}")
    public ResponseEntity<?> getPermissions(@PathVariable String role) {
        return ResponseEntity.ok(Map.of(
                "role", role.toUpperCase(),
                "permissions", userService.getPermissions(role),
                "allPermissions", userService.getAllPermissions()
        ));
    }

    @PutMapping("/permissions/{role}")
    public ResponseEntity<?> setPermissions(@PathVariable String role,
                                             @RequestBody Map<String, List<String>> body) {
        try {
            userService.setPermissions(role, body.getOrDefault("permissions", List.of()));
            return ResponseEntity.ok(Map.of(
                    "role", role.toUpperCase(),
                    "permissions", userService.getPermissions(role)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
