package com.blocklyplatform.repository;

import com.blocklyplatform.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<Like, Long> {
    long countByExerciseId(Long exerciseId);
    java.util.Optional<Like> findByExerciseIdAndClientId(Long exerciseId, String clientId);
    void deleteByExerciseIdAndClientId(Long exerciseId, String clientId);
}
