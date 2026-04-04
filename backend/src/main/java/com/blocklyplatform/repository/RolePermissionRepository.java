package com.blocklyplatform.repository;

import com.blocklyplatform.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermission.RolePermissionId> {

    List<RolePermission> findByRole(String role);

    void deleteByRole(String role);
}
