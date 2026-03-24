package com.blocklyplatform.service;

import com.blocklyplatform.entity.User;
import com.blocklyplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${super-admin.username}")
    private String superAdminUsername;

    @Value("${super-admin.password}")
    private String superAdminPassword;

    public boolean isSuperAdmin(String username) {
        return superAdminUsername.equalsIgnoreCase(username);
    }

    public String login(String username, String password) {
        // Check super admin first (not stored in DB)
        if (isSuperAdmin(username)) {
            if (superAdminPassword.equals(password)) {
                return jwtService.generateToken(superAdminUsername.toLowerCase(), "SUPER_ADMIN", 0);
            }
            throw new RuntimeException("Invalid credentials");
        }

        // Check DB user
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!user.getEnabled()) {
            throw new RuntimeException("Account is disabled");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        return jwtService.generateToken(user.getUsername(), user.getRole(), user.getTokenVersion());
    }
}
