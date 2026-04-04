package com.blocklyplatform.repository;

import com.blocklyplatform.entity.Exercise;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    List<Exercise> findByDeletedAtIsNullOrderByCreatedAtDesc();

    List<Exercise> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status);

    Optional<Exercise> findByIdAndDeletedAtIsNull(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Exercise e WHERE e.id = :id AND e.deletedAt IS NULL")
    Optional<Exercise> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT e FROM Exercise e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL " +
           "AND (:category IS NULL OR e.category = :category) " +
           "AND (:difficulty IS NULL OR e.difficulty = :difficulty) " +
           "ORDER BY e.createdAt ASC")
    List<Exercise> findPublishedFiltered(
        @Param("category") String category,
        @Param("difficulty") String difficulty
    );

    @Query("SELECT e FROM Exercise e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL " +
           "AND (:category IS NULL OR e.category = :category) " +
           "AND (:difficulties IS NULL OR e.difficulty IN :difficulties) " +
           "ORDER BY e.createdAt ASC")
    List<Exercise> findPublishedFilteredByDifficulties(
        @Param("category") String category,
        @Param("difficulties") List<String> difficulties
    );
}
