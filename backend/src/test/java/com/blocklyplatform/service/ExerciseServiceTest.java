package com.blocklyplatform.service;

import com.blocklyplatform.dto.ExerciseCreateDto;
import com.blocklyplatform.entity.Exercise;
import com.blocklyplatform.entity.ExerciseVersion;
import com.blocklyplatform.entity.Like;
import com.blocklyplatform.repository.ExerciseRepository;
import com.blocklyplatform.repository.ExerciseVersionRepository;
import com.blocklyplatform.repository.LikeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock
    private ExerciseRepository exerciseRepo;

    @Mock
    private ExerciseVersionRepository versionRepo;

    @Mock
    private LikeRepository likeRepo;

    @InjectMocks
    private ExerciseService exerciseService;

    private Exercise exercise;

    @BeforeEach
    void setUp() {
        exercise = new Exercise();
        exercise.setId(1L);
        exercise.setCode("TEST-001");
        exercise.setTitle("Test Exercise");
        exercise.setStatus("DRAFT");
        exercise.setCurrentVersionNumber(1);
        exercise.setLikeCount(0);
    }

    // 1. like() with new clientId -> increments likeCount, returns liked=true
    @Test
    void like_newClientId_incrementsLikeCountAndReturnsLikedTrue() {
        when(exerciseRepo.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(exercise));
        when(likeRepo.findByExerciseIdAndClientId(1L, "client-abc")).thenReturn(Optional.empty());
        when(likeRepo.save(any(Like.class))).thenAnswer(inv -> inv.getArgument(0));
        when(exerciseRepo.save(any(Exercise.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = exerciseService.like(1L, "client-abc");

        assertTrue((Boolean) result.get("liked"));
        assertEquals(1, result.get("likeCount"));
        verify(likeRepo, times(1)).save(any(Like.class));
        verify(exerciseRepo, times(1)).save(exercise);
    }

    // 2. like() with existing clientId -> does not increment, returns liked=true
    @Test
    void like_existingClientId_doesNotIncrementLikeCount() {
        exercise.setLikeCount(5);
        Like existingLike = new Like();
        when(exerciseRepo.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(exercise));
        when(likeRepo.findByExerciseIdAndClientId(1L, "client-abc")).thenReturn(Optional.of(existingLike));

        Map<String, Object> result = exerciseService.like(1L, "client-abc");

        assertTrue((Boolean) result.get("liked"));
        assertEquals(5, result.get("likeCount"));
        verify(likeRepo, never()).save(any(Like.class));
        verify(exerciseRepo, never()).save(any(Exercise.class));
    }

    // 3. publish() with no version -> throws exception
    @Test
    void publish_noVersion_throwsException() {
        exercise.setCurrentVersionNumber(0);
        when(exerciseRepo.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(exercise));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> exerciseService.publish(1L));
        assertTrue(ex.getMessage().contains("Cannot publish"));
    }

    // 4. delete() soft-deletes (sets deletedAt)
    @Test
    void delete_softDeletesSetsDeletedAt() {
        when(exerciseRepo.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(exercise));
        when(exerciseRepo.save(any(Exercise.class))).thenAnswer(inv -> inv.getArgument(0));

        assertNull(exercise.getDeletedAt());
        exerciseService.delete(1L);

        ArgumentCaptor<Exercise> captor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepo).save(captor.capture());
        assertNotNull(captor.getValue().getDeletedAt());
    }
}
