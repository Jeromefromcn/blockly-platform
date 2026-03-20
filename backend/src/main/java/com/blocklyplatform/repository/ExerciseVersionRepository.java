package com.blocklyplatform.repository;

import com.blocklyplatform.entity.ExerciseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExerciseVersionRepository extends JpaRepository<ExerciseVersion, Long> {

    List<ExerciseVersion> findByExerciseIdOrderByVersionNumberDesc(Long exerciseId);

    @Query("SELECT v FROM ExerciseVersion v WHERE v.exercise.id = :exerciseId AND v.versionNumber = :versionNumber")
    Optional<ExerciseVersion> findByExerciseIdAndVersionNumber(
            @Param("exerciseId") Long exerciseId,
            @Param("versionNumber") Integer versionNumber);
}
