package com.blocklyplatform.service;

import com.blocklyplatform.entity.RolePermission;
import com.blocklyplatform.entity.User;
import com.blocklyplatform.repository.RolePermissionRepository;
import com.blocklyplatform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setUsername("tutor1");
        sampleUser.setRole("TUTOR");
        sampleUser.setPasswordHash("$2a$10$hashed");
        sampleUser.setEnabled(true);
        sampleUser.setTokenVersion(0);
    }

    // 1. createUser saves user with BCrypt hashed password
    @Test
    void createUser_newUser_savesWithHashedPassword() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("mypass")).thenReturn("$2a$hashed-mypass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = userService.createUser("newuser", "mypass", "TUTOR", "New User", "new@example.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("newuser", saved.getUsername());
        assertEquals("$2a$hashed-mypass", saved.getPasswordHash());
        assertEquals("TUTOR", saved.getRole());
        assertEquals("newuser", result.get("username"));
    }

    // 2. createUser throws if username already exists
    @Test
    void createUser_duplicateUsername_throwsException() {
        when(userRepository.existsByUsername("tutor1")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.createUser("tutor1", "pass", "TUTOR", null, null));
        assertTrue(ex.getMessage().contains("Username already exists"));
    }

    // 3. createUser with invalid role throws exception
    @Test
    void createUser_invalidRole_throwsException() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.createUser("newuser", "pass", "ADMIN", null, null));
        assertTrue(ex.getMessage().contains("Invalid role"));
    }

    // 4. createUser with null/empty password uses default password (12345678)
    @Test
    void createUser_nullPassword_usesDefaultPassword() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("12345678")).thenReturn("$2a$hashed-default");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.createUser("newuser", null, "STUDENT", null, null);

        verify(passwordEncoder).encode("12345678");
    }

    // 5. resetPassword sets password to BCrypt(12345678) and increments tokenVersion
    @Test
    void resetPassword_setsDefaultPasswordAndIncrementsTokenVersion() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.encode("12345678")).thenReturn("$2a$hashed-default");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.resetPassword(1L);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("$2a$hashed-default", saved.getPasswordHash());
        assertEquals(1, saved.getTokenVersion()); // incremented from 0
    }

    // 6. forceLogout increments token_version
    @Test
    void forceLogout_incrementsTokenVersion() {
        sampleUser.setTokenVersion(3);
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.forceLogout(1L);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals(4, captor.getValue().getTokenVersion());
    }

    // 7. deleteUser calls repository delete
    @Test
    void deleteUser_existingUser_callsRepositoryDelete() {
        when(userRepository.existsById(1L)).thenReturn(true);

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    // 8. deleteUser throws if user not found
    @Test
    void deleteUser_nonExistentUser_throwsException() {
        when(userRepository.existsById(99L)).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.deleteUser(99L));
        assertEquals("User not found", ex.getMessage());
    }

    // 9. getPermissions returns list of permissions for a role
    @Test
    void getPermissions_tutorRole_returnsPermissionsFromRepository() {
        RolePermission rp1 = new RolePermission();
        rp1.setRole("TUTOR");
        rp1.setPermission("VIEW_EXERCISES");

        RolePermission rp2 = new RolePermission();
        rp2.setRole("TUTOR");
        rp2.setPermission("GRADE_SUBMISSIONS");

        when(rolePermissionRepository.findByRole("TUTOR")).thenReturn(List.of(rp1, rp2));

        List<String> perms = userService.getPermissions("TUTOR");

        assertEquals(2, perms.size());
        assertTrue(perms.contains("VIEW_EXERCISES"));
        assertTrue(perms.contains("GRADE_SUBMISSIONS"));
    }

    // 10. getPermissions for SUPER_ADMIN returns all permissions without hitting repository
    @Test
    void getPermissions_superAdminRole_returnsAllPermissions() {
        List<String> perms = userService.getPermissions("SUPER_ADMIN");

        assertEquals(5, perms.size());
        assertTrue(perms.contains("VIEW_EXERCISES"));
        assertTrue(perms.contains("SUBMIT_EXERCISES"));
        assertTrue(perms.contains("GRADE_SUBMISSIONS"));
        assertTrue(perms.contains("MANAGE_EXERCISES"));
        assertTrue(perms.contains("MANAGE_USERS"));
        verifyNoInteractions(rolePermissionRepository);
    }

    // 11. setPermissions replaces permissions for role
    @Test
    void setPermissions_tutorRole_deletesOldAndSavesNew() {
        List<String> newPerms = List.of("VIEW_EXERCISES", "GRADE_SUBMISSIONS");
        when(rolePermissionRepository.save(any(RolePermission.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.setPermissions("TUTOR", newPerms);

        verify(rolePermissionRepository).deleteByRole("TUTOR");
        // Each valid permission is saved once
        ArgumentCaptor<RolePermission> captor = ArgumentCaptor.forClass(RolePermission.class);
        verify(rolePermissionRepository, times(2)).save(captor.capture());
        List<RolePermission> saved = captor.getAllValues();
        assertTrue(saved.stream().anyMatch(rp -> "VIEW_EXERCISES".equals(rp.getPermission())));
        assertTrue(saved.stream().anyMatch(rp -> "GRADE_SUBMISSIONS".equals(rp.getPermission())));
    }

    // 12. setPermissions throws for invalid role (e.g. SUPER_ADMIN)
    @Test
    void setPermissions_superAdminRole_throwsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.setPermissions("SUPER_ADMIN", List.of("VIEW_EXERCISES")));
        assertTrue(ex.getMessage().contains("TUTOR or STUDENT"));
    }

    // 13. importCsv creates multiple users from CSV content
    @Test
    void importCsv_validCsv_createsMultipleUsers() throws Exception {
        String csvContent = "username,password,role\nalice,pass1,TUTOR\nbob,pass2,STUDENT\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "users.csv", "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8));

        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByUsername("bob")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        List<Map<String, Object>> results = userService.importCsv(file);

        assertEquals(2, results.size());
        assertEquals("alice", results.get(0).get("username"));
        assertEquals("created", results.get(0).get("status"));
        assertEquals("bob", results.get(1).get("username"));
        assertEquals("created", results.get(1).get("status"));
    }

    // 14. importCsv records failed status for duplicate usernames without throwing
    @Test
    void importCsv_duplicateUsername_recordsFailedStatus() throws Exception {
        String csvContent = "username,password,role\nalice,pass1,TUTOR\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "users.csv", "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8));

        when(userRepository.existsByUsername("alice")).thenReturn(true);

        List<Map<String, Object>> results = userService.importCsv(file);

        assertEquals(1, results.size());
        assertEquals("failed", results.get(0).get("status"));
        assertNotNull(results.get(0).get("error"));
    }

    // 15. updateProfile updates displayName and email
    @Test
    void updateProfile_validId_updatesDisplayNameAndEmail() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = userService.updateProfile(1L, "Alice Smith", "alice@example.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("Alice Smith", captor.getValue().getDisplayName());
        assertEquals("alice@example.com", captor.getValue().getEmail());
    }

    // 16. changePassword succeeds with correct old password
    @Test
    void changePassword_correctOldPassword_updatesHash() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("oldpass", "$2a$10$hashed")).thenReturn(true);
        when(passwordEncoder.encode("newpass")).thenReturn("$2a$10$new-hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> userService.changePassword(1L, "oldpass", "newpass"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("$2a$10$new-hashed", captor.getValue().getPasswordHash());
        assertEquals(1, captor.getValue().getTokenVersion()); // incremented
    }

    // 17. changePassword fails with wrong old password
    @Test
    void changePassword_wrongOldPassword_throwsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongpass", "$2a$10$hashed")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.changePassword(1L, "wrongpass", "newpass"));
        assertEquals("Current password is incorrect", ex.getMessage());
        verify(userRepository, never()).save(any());
    }
}
