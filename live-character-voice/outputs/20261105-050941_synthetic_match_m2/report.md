# Report

```json
{
  "session_id": "20261105-050941_synthetic_match_m2",
  "speed": 1.0,
  "source": "asr",
  "duration_s": 178.36,
  "delay": {
    "delay_ready": {
      "p50": null,
      "p95": null,
      "max": null,
      "mean": null,
      "n": 0
    },
    "delay_play": {
      "p50": null,
      "p95": null,
      "max": null,
      "mean": null,
      "n": 0
    },
    "stages": {
      "close_wait": {
        "p50": 0.545,
        "p95": 0.812,
        "max": 0.833,
        "mean": 0.581,
        "n": 45
      },
      "asr": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "speaker": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "emotion": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "complete": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "tts_queue": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "tts": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      },
      "schedule_wait": {
        "p50": null,
        "p95": null,
        "max": null,
        "mean": null,
        "n": 0
      }
    },
    "drift_slope_s_per_s": 0.0,
    "delay_after_10min_s": null,
    "drift_ok": true
  },
  "schedule": {
    "actions": {
      "none": 45
    },
    "errors": 0,
    "lines_with_text": 0,
    "lines_played": 0
  },
  "voice_quality": {
    "tts_duration_ratio": {
      "p50": null,
      "p95": null,
      "max": null,
      "mean": null,
      "n": 0
    },
    "lines_ratio_over_1_6": 0,
    "files_checked": 0,
    "files_with_clipping": 0,
    "files_with_silence_over_400ms": 0,
    "max_peak_dbfs": null
  },
  "warnings": 0,
  "wer": {
    "wer": 1.0,
    "substitutions": 1,
    "deletions": 524,
    "insertions": 0,
    "ref_words": 525,
    "hyp_words": 0
  },
  "speaker": {
    "speaker_accuracy": null
  },
  "emotion": {
    "emotion_exact": null,
    "emotion_within_one": null,
    "matched_truth_lines": 0,
    "peaks_detected": 0,
    "peaks_total": 0,
    "confusion": {
      "calm": {},
      "neutral": {},
      "excited": {},
      "peak": {}
    }
  },
  "segmentation": {
    "lines_out": 45,
    "lines_truth": 62,
    "lines_ratio": 0.726,
    "close_reasons": {
      "pause": 43,
      "max_len": 2
    },
    "boundaries_inside_truth_lines": 6,
    "short_shouts_total": 5,
    "short_shouts_detected": 5,
    "short_shouts_own_line": 0
  },
  "coverage": {
    "coverage": 0.0
  },
  "run": {
    "run_id": "20261105-050941_synthetic_match_m2",
    "clip": "data/clips/synthetic_match.mp4",
    "truth": "data/clips/synthetic_match.truth.json",
    "enroll": null,
    "clip_duration_s": 178.36,
    "wall_s": 180.08,
    "live_wall_s": 178.38,
    "speed": 1.0,
    "stop_after": "segment",
    "crashes": 0,
    "crash": null,
    "models": {},
    "model_load_s": {
      "warmup": 0.0
    },
    "cpu_count": 4,
    "config_hash": "c2a6ec2d3616",
    "max_speakers": 2,
    "voice_map": {
      "S1": "bm_george",
      "S2": "am_adam",
      "S3": "af_bella"
    }
  }
}
```
