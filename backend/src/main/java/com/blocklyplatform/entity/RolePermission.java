package com.blocklyplatform.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@Entity
@Table(name = "role_permissions")
@IdClass(RolePermission.RolePermissionId.class)
public class RolePermission {

    @Id
    @Column(length = 20)
    private String role;

    @Id
    @Column(length = 50)
    private String permission;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RolePermissionId implements Serializable {
        private String role;
        private String permission;
    }
}
