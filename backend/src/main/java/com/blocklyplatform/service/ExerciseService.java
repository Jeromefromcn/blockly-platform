package com.blocklyplatform.service;

import com.blocklyplatform.dto.ExerciseCreateDto;
import com.blocklyplatform.entity.Exercise;
import com.blocklyplatform.entity.ExerciseVersion;
import com.blocklyplatform.entity.Like;
import com.blocklyplatform.repository.ExerciseRepository;
import com.blocklyplatform.repository.ExerciseVersionRepository;
import com.blocklyplatform.repository.LikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseRepository exerciseRepo;
    private final ExerciseVersionRepository versionRepo;
    private final LikeRepository likeRepo;

    public List<Map<String, Object>> listAll() {
        return exerciseRepo.findByDeletedAtIsNullOrderByCreatedAtDesc()
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    public List<Map<String, Object>> listPublished() {
        return exerciseRepo.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED")
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    public Map<String, Object> getWithVersion(Long id) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        Map<String, Object> result = toMap(ex);
        if (ex.getCurrentVersionNumber() > 0) {
            versionRepo.findByExerciseIdAndVersionNumber(id, ex.getCurrentVersionNumber())
                    .ifPresent(v -> result.put("version", toVersionMap(v)));
        }
        return result;
    }

    public List<Map<String, Object>> listVersions(Long exerciseId) {
        return versionRepo.findByExerciseIdOrderByVersionNumberDesc(exerciseId)
                .stream().map(this::toVersionMap).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> create(ExerciseCreateDto dto) {
        Exercise ex = new Exercise();
        ex.setCode(dto.getCode());
        ex.setTitle(dto.getTitle());
        exerciseRepo.save(ex);

        ExerciseVersion version = saveVersion(ex, dto);
        ex.setCurrentVersionNumber(version.getVersionNumber());
        exerciseRepo.save(ex);

        Map<String, Object> result = toMap(ex);
        result.put("version", toVersionMap(version));
        return result;
    }

    @Transactional
    public Map<String, Object> update(Long id, ExerciseCreateDto dto) {
        Exercise ex = exerciseRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        ex.setTitle(dto.getTitle());

        ExerciseVersion version = saveVersion(ex, dto);
        ex.setCurrentVersionNumber(version.getVersionNumber());
        exerciseRepo.save(ex);

        Map<String, Object> result = toMap(ex);
        result.put("version", toVersionMap(version));
        return result;
    }

    @Transactional
    public Map<String, Object> publish(Long id) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        if (ex.getCurrentVersionNumber() == 0)
            throw new RuntimeException("Cannot publish: no version exists");
        ex.setStatus("PUBLISHED");
        exerciseRepo.save(ex);
        return toMap(ex);
    }

    @Transactional
    public Map<String, Object> unpublish(Long id) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        ex.setStatus("DRAFT");
        exerciseRepo.save(ex);
        return toMap(ex);
    }

    @Transactional
    public Map<String, Object> rollback(Long id, Integer versionNumber) {
        Exercise ex = exerciseRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        versionRepo.findByExerciseIdAndVersionNumber(id, versionNumber)
                .orElseThrow(() -> new RuntimeException("Version not found"));
        ex.setCurrentVersionNumber(versionNumber);
        exerciseRepo.save(ex);
        return getWithVersion(id);
    }

    @Transactional
    public void delete(Long id) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        ex.setDeletedAt(LocalDateTime.now());
        exerciseRepo.save(ex);
    }

    @Transactional
    public Map<String, Object> like(Long id, String clientId) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        if (likeRepo.findByExerciseIdAndClientId(id, clientId).isPresent()) {
            return Map.of("exerciseId", id, "likeCount", ex.getLikeCount(), "liked", true);
        }
        Like like = new Like();
        like.setExercise(ex);
        like.setClientId(clientId);
        likeRepo.save(like);
        ex.setLikeCount(ex.getLikeCount() + 1);
        exerciseRepo.save(ex);
        return Map.of("exerciseId", id, "likeCount", ex.getLikeCount(), "liked", true);
    }

    private ExerciseVersion saveVersion(Exercise ex, ExerciseCreateDto dto) {
        int newVersionNumber = ex.getCurrentVersionNumber() + 1;
        ExerciseVersion version = new ExerciseVersion();
        version.setExercise(ex);
        version.setVersionNumber(newVersionNumber);
        version.setDescription(dto.getDescription());
        version.setBlocklyState(dto.getBlocklyState());
        version.setExpectedOutput(dto.getExpectedOutput());
        version.setGradingMode(dto.getGradingMode() != null ? dto.getGradingMode() : "OUTPUT_MATCH");
        version.setAllowedBlocks(dto.getAllowedBlocks());
        version.setCreatedBy(dto.getCreatedBy());
        return versionRepo.save(version);
    }

    private Map<String, Object> toMap(Exercise ex) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", ex.getId());
        m.put("code", ex.getCode());
        m.put("title", ex.getTitle());
        m.put("status", ex.getStatus());
        m.put("currentVersionNumber", ex.getCurrentVersionNumber());
        m.put("likeCount", ex.getLikeCount());
        m.put("createdAt", ex.getCreatedAt());
        m.put("updatedAt", ex.getUpdatedAt());
        return m;
    }

    private Map<String, Object> toVersionMap(ExerciseVersion v) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", v.getId());
        m.put("versionNumber", v.getVersionNumber());
        m.put("description", v.getDescription());
        m.put("blocklyState", v.getBlocklyState());
        m.put("expectedOutput", v.getExpectedOutput());
        m.put("gradingMode", v.getGradingMode());
        m.put("allowedBlocks", v.getAllowedBlocks());
        m.put("createdBy", v.getCreatedBy());
        m.put("createdAt", v.getCreatedAt());
        return m;
    }
}
