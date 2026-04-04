package com.blocklyplatform.service;

import com.blocklyplatform.entity.User;
import com.blocklyplatform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        // Inject @Value fields that Spring cannot inject in plain Mockito tests
        ReflectionTestUtils.setField(authService, "superAdminUsername", "admin");
        ReflectionTestUtils.setField(authService, "superAdminPassword", "admin123");
    }

    // Helper to build a minimal enabled DB User
    private User buildUser(String username, String role, String passwordHash) {
        User user = new User();
        user.setId(1L);
        user.setUsername(username);
        user.setRole(role);
        user.setPasswordHash(passwordHash);
        user.setEnabled(true);
        user.setTokenVersion(0);
        return user;
    }

    // 1. Login with valid super admin credentials returns token
    @Test
    void login_validSuperAdminCredentials_returnsToken() {
        when(jwtService.generateToken("admin", "SUPER_ADMIN", 0)).thenReturn("super-token");

        String token = authService.login("admin", "admin123");

        assertEquals("super-token", token);
        verify(jwtService).generateToken("admin", "SUPER_ADMIN", 0);
        verifyNoInteractions(userRepository);
    }

    // 2. Login with wrong super admin password throws exception
    @Test
    void login_wrongSuperAdminPassword_throwsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.login("admin", "wrong-password"));
        assertEquals("Invalid credentials", ex.getMessage());
    }

    // 3. Login with valid DB TUTOR user returns token
    @Test
    void login_validTutorUser_returnsToken() {
        User tutor = buildUser("tutor1", "TUTOR", "$2a$hashed");
        when(userRepository.findByUsername("tutor1")).thenReturn(Optional.of(tutor));
        when(passwordEncoder.matches("pass", "$2a$hashed")).thenReturn(true);
        when(jwtService.generateToken("tutor1", "TUTOR", 0)).thenReturn("tutor-token");

        String token = authService.login("tutor1", "pass");

        assertEquals("tutor-token", token);
    }

    // 4. Login with valid DB STUDENT user returns token
    @Test
    void login_validStudentUser_returnsToken() {
        User student = buildUser("student1", "STUDENT", "$2a$hashed");
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(student));
        when(passwordEncoder.matches("pass", "$2a$hashed")).thenReturn(true);
        when(jwtService.generateToken("student1", "STUDENT", 0)).thenReturn("student-token");

        String token = authService.login("student1", "pass");

        assertEquals("student-token", token);
    }

    // 5. Login with wrong DB user password throws exception
    @Test
    void login_wrongDbUserPassword_throwsException() {
        User user = buildUser("tutor1", "TUTOR", "$2a$hashed");
        when(userRepository.findByUsername("tutor1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad-pass", "$2a$hashed")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.login("tutor1", "bad-pass"));
        assertEquals("Invalid credentials", ex.getMessage());
    }

    // 6. Login with non-existent username throws exception
    @Test
    void login_nonExistentUsername_throwsException() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.login("ghost", "any-pass"));
        assertEquals("Invalid credentials", ex.getMessage());
    }

    // 7. Login with disabled DB user throws exception
    @Test
    void login_disabledUser_throwsException() {
        User user = buildUser("tutor1", "TUTOR", "$2a$hashed");
        user.setEnabled(false);
        when(userRepository.findByUsername("tutor1")).thenReturn(Optional.of(user));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.login("tutor1", "pass"));
        assertEquals("Account is disabled", ex.getMessage());
    }

    // 8. isSuperAdmin returns true for configured super admin username (case-insensitive)
    @Test
    void isSuperAdmin_configuredUsername_returnsTrue() {
        assertTrue(authService.isSuperAdmin("admin"));
        assertTrue(authService.isSuperAdmin("ADMIN"));
        assertTrue(authService.isSuperAdmin("Admin"));
    }

    // 9. isSuperAdmin returns false for regular user
    @Test
    void isSuperAdmin_regularUsername_returnsFalse() {
        assertFalse(authService.isSuperAdmin("tutor1"));
        assertFalse(authService.isSuperAdmin("student1"));
        assertFalse(authService.isSuperAdmin(""));
    }
}
