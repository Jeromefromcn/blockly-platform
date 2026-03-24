package com.blocklyplatform.service;

import com.blocklyplatform.entity.RolePermission;
import com.blocklyplatform.entity.User;
import com.blocklyplatform.repository.RolePermissionRepository;
import com.blocklyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String DEFAULT_PASSWORD = "12345678";
    private static final List<String> ALL_PERMISSIONS = List.of(
            "VIEW_EXERCISES", "SUBMIT_EXERCISES", "GRADE_SUBMISSIONS",
            "MANAGE_EXERCISES", "MANAGE_USERS"
    );

    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Map<String, Object> createUser(String username, String password, String role,
                                           String displayName, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists: " + username);
        }
        if (!List.of("TUTOR", "STUDENT").contains(role)) {
            throw new RuntimeException("Invalid role. Must be TUTOR or STUDENT");
        }
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password != null && !password.isEmpty()
                ? password : DEFAULT_PASSWORD));
        user.setRole(role);
        user.setDisplayName(displayName);
        user.setEmail(email);
        userRepository.save(user);
        return toMap(user);
    }

    public List<Map<String, Object>> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> resetPassword(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        return toMap(user);
    }

    @Transactional
    public Map<String, Object> forceLogout(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        return toMap(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
    }

    @Transactional
    public List<Map<String, Object>> importCsv(MultipartFile file) {
        List<Map<String, Object>> results = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader("username", "password", "role")
                     .setSkipHeaderRecord(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                String username = record.get("username").trim();
                String password = record.get("password").trim();
                String role = record.get("role").trim().toUpperCase();
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("username", username);
                try {
                    createUser(username, password, role, null, null);
                    result.put("status", "created");
                } catch (Exception e) {
                    result.put("status", "failed");
                    result.put("error", e.getMessage());
                }
                results.add(result);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage());
        }
        return results;
    }

    @Transactional
    public Map<String, Object> updateProfile(Long id, String displayName, String email) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setDisplayName(displayName);
        user.setEmail(email);
        userRepository.save(user);
        return toMap(user);
    }

    @Transactional
    public void changePassword(Long id, String oldPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    public List<String> getPermissions(String role) {
        if ("SUPER_ADMIN".equalsIgnoreCase(role)) {
            return new ArrayList<>(ALL_PERMISSIONS);
        }
        return rolePermissionRepository.findByRole(role.toUpperCase()).stream()
                .map(RolePermission::getPermission)
                .collect(Collectors.toList());
    }

    @Transactional
    public void setPermissions(String role, List<String> permissions) {
        String roleUpper = role.toUpperCase();
        if (!List.of("TUTOR", "STUDENT").contains(roleUpper)) {
            throw new RuntimeException("Can only set permissions for TUTOR or STUDENT roles");
        }
        rolePermissionRepository.deleteByRole(roleUpper);
        for (String perm : permissions) {
            if (ALL_PERMISSIONS.contains(perm)) {
                RolePermission rp = new RolePermission();
                rp.setRole(roleUpper);
                rp.setPermission(perm);
                rolePermissionRepository.save(rp);
            }
        }
    }

    public List<String> getAllPermissions() {
        return ALL_PERMISSIONS;
    }

    private Map<String, Object> toMap(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("username", user.getUsername());
        m.put("role", user.getRole());
        m.put("displayName", user.getDisplayName());
        m.put("email", user.getEmail());
        m.put("enabled", user.getEnabled());
        m.put("tokenVersion", user.getTokenVersion());
        m.put("createdAt", user.getCreatedAt());
        return m;
    }
}
