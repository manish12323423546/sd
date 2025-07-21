"""
Data Validator - Validates input data consistency and quality
"""

import logging
from typing import Dict, List, Any, Tuple, Set
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)


class DataValidator:
    """
    Validates input data consistency and quality for film budget pipeline
    """
    
    @staticmethod
    def validate_coordinator_input(data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate coordinator input data and fix common issues
        
        Returns:
            (validated_data, warnings)
        """
        validated_data = data.copy()
        warnings = []
        
        if "coordinatorInput" not in data:
            warnings.append("Missing coordinatorInput key")
            return validated_data, warnings
        
        coordinator_input = data["coordinatorInput"]
        
        # Validate scene data
        if "scenes" in coordinator_input:
            validated_scenes, scene_warnings = DataValidator._validate_scenes(
                coordinator_input["scenes"]
            )
            validated_data["coordinatorInput"]["scenes"] = validated_scenes
            warnings.extend(scene_warnings)
        
        # Validate character consistency
        if "scenes" in coordinator_input:
            char_warnings = DataValidator._validate_character_consistency(
                coordinator_input["scenes"]
            )
            warnings.extend(char_warnings)
        
        # Validate script data consistency
        if "scriptData" in coordinator_input and "scenes" in coordinator_input:
            script_warnings = DataValidator._validate_script_consistency(
                coordinator_input["scriptData"], 
                coordinator_input["scenes"]
            )
            warnings.extend(script_warnings)
        
        return validated_data, warnings
    
    @staticmethod
    def _validate_scenes(scenes: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Validate individual scene data"""
        validated_scenes = []
        warnings = []
        
        for i, scene in enumerate(scenes):
            validated_scene = scene.copy()
            
            # Validate required fields
            if "sceneId" not in scene:
                validated_scene["sceneId"] = i + 1
                warnings.append(f"Scene {i+1}: Missing sceneId, assigned {i+1}")
            
            if "sceneName" not in scene or not scene["sceneName"]:
                validated_scene["sceneName"] = f"Scene {validated_scene['sceneId']}"
                warnings.append(f"Scene {validated_scene['sceneId']}: Missing sceneName")
            
            # Validate pages
            if "pages" not in scene or not isinstance(scene["pages"], (int, float)):
                validated_scene["pages"] = 1.0
                warnings.append(f"Scene {validated_scene['sceneId']}: Invalid pages, defaulted to 1.0")
            
            # Validate cast list
            if "cast" not in scene:
                validated_scene["cast"] = []
                warnings.append(f"Scene {validated_scene['sceneId']}: Missing cast list")
            elif not isinstance(scene["cast"], list):
                validated_scene["cast"] = []
                warnings.append(f"Scene {validated_scene['sceneId']}: Cast is not a list")
            
            # Validate location
            if "location" not in scene or not scene["location"]:
                validated_scene["location"] = "UNKNOWN_LOCATION"
                warnings.append(f"Scene {validated_scene['sceneId']}: Missing location")
            
            validated_scenes.append(validated_scene)
        
        return validated_scenes, warnings
    
    @staticmethod
    def _validate_character_consistency(scenes: List[Dict[str, Any]]) -> List[str]:
        """Validate character scene count consistency"""
        warnings = []
        
        # Count actual scene appearances
        character_scenes = defaultdict(list)
        
        for scene in scenes:
            scene_id = scene.get("sceneId", "unknown")
            cast = scene.get("cast", [])
            
            for character in cast:
                if isinstance(character, str):
                    character_scenes[character].append(scene_id)
        
        # Generate character consistency report
        if character_scenes:
            warnings.append("=== CHARACTER SCENE COUNT ANALYSIS ===")
            
            for character, scene_list in sorted(character_scenes.items()):
                scene_count = len(scene_list)
                scene_ids = sorted(scene_list)
                
                warnings.append(
                    f"✅ {character}: appears in {scene_count} scenes "
                    f"(scenes: {', '.join(map(str, scene_ids))})"
                )
                
                # Flag potential issues
                if scene_count == 1:
                    warnings.append(f"⚠️  {character}: Only appears in 1 scene - verify if correct")
                elif scene_count > 20:
                    warnings.append(f"📋 {character}: Appears in {scene_count} scenes - major character")
        
        return warnings
    
    @staticmethod
    def _validate_script_consistency(script_data: Dict[str, Any], scenes: List[Dict[str, Any]]) -> List[str]:
        """Validate script-level data consistency"""
        warnings = []
        
        # Validate scene count
        declared_scenes = script_data.get("totalScenes", 0)
        actual_scenes = len(scenes)
        
        if declared_scenes != actual_scenes:
            warnings.append(
                f"⚠️  Scene count mismatch: declared {declared_scenes}, "
                f"actual {actual_scenes} scenes provided"
            )
        
        # Validate page count
        declared_pages = script_data.get("totalPages", 0)
        actual_pages = sum(scene.get("pages", 0) for scene in scenes)
        
        if abs(declared_pages - actual_pages) > 5:  # Allow 5 page variance
            warnings.append(
                f"⚠️  Page count mismatch: declared {declared_pages}, "
                f"calculated {actual_pages:.1f} from scenes"
            )
        
        # Validate eighths calculation
        if "eighths" in script_data:
            declared_eighths = script_data["eighths"]
            calculated_eighths = actual_pages * 8
            
            if abs(declared_eighths - calculated_eighths) > 40:  # Allow 5 page variance
                warnings.append(
                    f"⚠️  Eighths calculation: declared {declared_eighths}, "
                    f"calculated {calculated_eighths:.0f} from pages"
                )
        
        return warnings
    
    @staticmethod
    def generate_data_quality_report(data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive data quality report"""
        report = {
            "overall_quality": "UNKNOWN",
            "total_warnings": 0,
            "validation_details": {},
            "recommendations": []
        }
        
        try:
            validated_data, warnings = DataValidator.validate_coordinator_input(data)
            
            report["total_warnings"] = len(warnings)
            report["validation_details"]["warnings"] = warnings
            
            # Determine overall quality
            if len(warnings) == 0:
                report["overall_quality"] = "EXCELLENT"
            elif len(warnings) <= 5:
                report["overall_quality"] = "GOOD"
            elif len(warnings) <= 15:
                report["overall_quality"] = "FAIR"
            else:
                report["overall_quality"] = "POOR"
                report["recommendations"].append("Consider reviewing input data quality")
            
            # Add specific recommendations
            warning_text = " ".join(warnings)
            
            if "scene count mismatch" in warning_text.lower():
                report["recommendations"].append("Verify scene count accuracy in script breakdown")
            
            if "character" in warning_text.lower():
                report["recommendations"].append("Review character casting and scene assignments")
            
            if "missing" in warning_text.lower():
                report["recommendations"].append("Complete missing data fields for better accuracy")
            
            report["validation_details"]["validated_data"] = validated_data
            
        except Exception as e:
            logger.error(f"Data validation failed: {str(e)}")
            report["overall_quality"] = "ERROR"
            report["validation_details"]["error"] = str(e)
        
        return report


def validate_and_clean_input(data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Convenience function to validate and clean input data
    
    Returns:
        (cleaned_data, quality_report)
    """
    validator = DataValidator()
    quality_report = validator.generate_data_quality_report(data)
    
    if "validated_data" in quality_report.get("validation_details", {}):
        cleaned_data = quality_report["validation_details"]["validated_data"]
    else:
        cleaned_data = data
    
    return cleaned_data, quality_report