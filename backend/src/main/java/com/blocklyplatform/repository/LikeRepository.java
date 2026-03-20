package com.blocklyplatform.repository;

import com.blocklyplatform.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<Like, Long> {
    long countByExerciseId(Long exerciseId);
}
