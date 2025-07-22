"""
Fallback Scheduler for 2001 Scheduling Pipeline
Provides basic scheduling when optimization agent fails
"""

import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class FallbackScheduler:
    """
    Simple fallback scheduler when optimization agent fails
    """
    
    def generate_schedule(self, pipeline_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic fallback schedule"""
        
        try:
            logger.info("Generating fallback schedule...")
            
            # Extract basic information from coordinator and resource agents
            coordinator_data = pipeline_results.get("coordinatorAgent", {})
            resource_data = pipeline_results.get("resourceLogisticsAgent", {})
            compliance_data = pipeline_results.get("complianceConstraintsAgent", {})
            
            # Create basic schedule structure
            fallback_schedule = {
                "optimizationScenarioOutput": {
                    "requestId": f"fallback_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    "processedTimestamp": datetime.utcnow().isoformat(),
                    "processingTime": 0.5,
                    "confidence": 0.7,
                    "optimizationStatus": "FALLBACK_BASIC_SCHEDULE",
                    "fallbackApplied": True,
                    "basicScheduleProposal": {
                        "scenario_name": "Basic Sequential Schedule",
                        "total_estimated_days": 180,
                        "scheduling_approach": "sequential_by_location",
                        "phases": [
                            {
                                "phase": "Kenya Location Work",
                                "estimated_days": 25,
                                "description": "All MOONWATCHER sequences"
                            },
                            {
                                "phase": "Studio Work - Space Station",
                                "estimated_days": 35,
                                "description": "All DR_FLOYD sequences"
                            },
                            {
                                "phase": "Studio Work - Discovery",
                                "estimated_days": 120,
                                "description": "All BOWMAN/POOLE sequences"
                            }
                        ]
                    },
                    "recommendations": [
                        "Manual scheduling required due to optimization failure",
                        "Review constraint compliance manually",
                        "Verify resource availability before production",
                        "Consider re-running optimization with adjusted parameters"
                    ]
                }
            }
            
            logger.info("Fallback schedule generated successfully")
            return fallback_schedule
            
        except Exception as e:
            logger.error(f"Fallback scheduler failed: {str(e)}")
            return {
                "optimizationScenarioOutput": {
                    "requestId": f"fallback_error_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    "processedTimestamp": datetime.utcnow().isoformat(),
                    "processingTime": 0.1,
                    "confidence": 0.0,
                    "optimizationStatus": "FALLBACK_FAILED",
                    "error": str(e),
                    "message": "Both optimization and fallback scheduling failed"
                }
            }