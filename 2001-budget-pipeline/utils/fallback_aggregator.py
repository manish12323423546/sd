"""
Fallback Budget Aggregator - Provides budget aggregation when main aggregator fails
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class FallbackBudgetAggregator:
    """
    Fallback budget aggregation when the main Budget Aggregator model fails
    """
    
    def __init__(self):
        self.standard_contingency_rates = {
            "above_the_line": 0.10,  # 10%
            "below_the_line": 0.15,  # 15%
            "post_production": 0.20,  # 20%
            "equipment": 0.12,       # 12%
            "locations": 0.18,       # 18%
            "insurance": 0.05        # 5%
        }
    
    def aggregate_budget(self, model_outputs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate budget from all model outputs using fallback logic
        """
        logger.info("🔄 FALLBACK AGGREGATION: Starting emergency budget compilation")
        
        try:
            # Extract costs from each model
            cost_breakdown = self._extract_model_costs(model_outputs)
            
            # Calculate totals
            totals = self._calculate_totals(cost_breakdown)
            
            # Apply contingencies
            contingency_totals = self._apply_contingencies(totals)
            
            # Generate final budget structure
            final_budget = self._generate_budget_structure(
                cost_breakdown, totals, contingency_totals, model_outputs
            )
            
            logger.info(f"✅ FALLBACK AGGREGATION: Completed successfully")
            logger.info(f"📊 Total Budget: ${final_budget['budgetSummary']['grandTotal']:,.0f}")
            
            return final_budget
            
        except Exception as e:
            logger.error(f"❌ FALLBACK AGGREGATION: Failed - {str(e)}")
            return self._generate_emergency_budget(model_outputs)
    
    def _extract_model_costs(self, model_outputs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Extract cost data from individual model outputs"""
        costs = {
            "labor": {},
            "equipment": {},
            "locations": {},
            "post_production": {},
            "insurance": {},
            "schedule": {},
            "tax_incentives": {},
            "cash_flow": {}
        }
        
        # Labor Cost Calculator
        if "laborCostCalculator" in model_outputs:
            labor_data = model_outputs["laborCostCalculator"].get("output_data", {})
            costs["labor"] = self._extract_labor_costs(labor_data)
        
        # Equipment Pricing Engine
        if "equipmentPricingEngine" in model_outputs:
            equipment_data = model_outputs["equipmentPricingEngine"].get("output_data", {})
            costs["equipment"] = self._extract_equipment_costs(equipment_data)
        
        # Location Cost Estimator
        if "locationCostEstimator" in model_outputs:
            location_data = model_outputs["locationCostEstimator"].get("output_data", {})
            costs["locations"] = self._extract_location_costs(location_data)
        
        # Post Production Estimator
        if "postProductionEstimator" in model_outputs:
            post_data = model_outputs["postProductionEstimator"].get("output_data", {})
            costs["post_production"] = self._extract_post_production_costs(post_data)
        
        # Insurance Calculator
        if "insuranceCalculator" in model_outputs:
            insurance_data = model_outputs["insuranceCalculator"].get("output_data", {})
            costs["insurance"] = self._extract_insurance_costs(insurance_data)
        
        # Tax Incentive Analyzer
        if "taxIncentiveAnalyzer" in model_outputs:
            tax_data = model_outputs["taxIncentiveAnalyzer"].get("output_data", {})
            costs["tax_incentives"] = self._extract_tax_incentives(tax_data)
        
        return costs
    
    def _extract_labor_costs(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract labor costs from labor calculator output"""
        labor_costs = {
            "above_the_line": 0.0,
            "below_the_line": 0.0,
            "total_base": 0.0,
            "overtime": 0.0,
            "fringes": 0.0,
            "total": 0.0
        }
        
        try:
            # Look for various possible data structures
            possible_keys = ["laborCostOutput", "laborCalculation", "costBreakdown"]
            labor_output = None
            
            for key in possible_keys:
                if key in data:
                    labor_output = data[key]
                    break
            
            if not labor_output and "totalLaborCost" in data:
                labor_costs["total"] = float(data["totalLaborCost"])
                return labor_costs
            
            if labor_output:
                # Extract from structured output
                if "aboveTheLineTotal" in labor_output:
                    labor_costs["above_the_line"] = float(labor_output["aboveTheLineTotal"])
                
                if "belowTheLineTotal" in labor_output:
                    labor_costs["below_the_line"] = float(labor_output["belowTheLineTotal"])
                
                if "totalLaborCost" in labor_output:
                    labor_costs["total"] = float(labor_output["totalLaborCost"])
                elif "grandTotal" in labor_output:
                    labor_costs["total"] = float(labor_output["grandTotal"])
            
            # If total not found, estimate from available data
            if labor_costs["total"] == 0.0:
                if labor_costs["above_the_line"] > 0 or labor_costs["below_the_line"] > 0:
                    labor_costs["total"] = labor_costs["above_the_line"] + labor_costs["below_the_line"]
                else:
                    # Look for any numeric values that might be costs
                    labor_costs["total"] = self._find_largest_numeric_value(data, 8000000)  # 8M default
            
        except Exception as e:
            logger.warning(f"Labor cost extraction failed: {str(e)}")
            labor_costs["total"] = 8000000  # Default estimate
        
        return labor_costs
    
    def _extract_equipment_costs(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract equipment costs"""
        equipment_costs = {
            "camera_package": 0.0,
            "lighting": 0.0,
            "custom_builds": 0.0,
            "transportation": 0.0,
            "total": 0.0
        }
        
        try:
            # Look for equipment cost structure
            if "totalEquipmentCost" in data:
                equipment_costs["total"] = float(data["totalEquipmentCost"])
            elif "grandTotal" in data:
                equipment_costs["total"] = float(data["grandTotal"])
            else:
                equipment_costs["total"] = self._find_largest_numeric_value(data, 1500000)  # 1.5M default
                
        except Exception as e:
            logger.warning(f"Equipment cost extraction failed: {str(e)}")
            equipment_costs["total"] = 1500000
        
        return equipment_costs
    
    def _extract_location_costs(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract location costs"""
        location_costs = {
            "set_construction": 0.0,
            "location_fees": 0.0,
            "permits": 0.0,
            "transportation": 0.0,
            "total": 0.0
        }
        
        try:
            if "totalLocationCost" in data:
                location_costs["total"] = float(data["totalLocationCost"])
            elif "grandTotal" in data:
                location_costs["total"] = float(data["grandTotal"])
            else:
                location_costs["total"] = self._find_largest_numeric_value(data, 2500000)  # 2.5M default
                
        except Exception as e:
            logger.warning(f"Location cost extraction failed: {str(e)}")
            location_costs["total"] = 2500000
        
        return location_costs
    
    def _extract_post_production_costs(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract post-production costs"""
        post_costs = {
            "editing": 0.0,
            "vfx": 0.0,
            "sound": 0.0,
            "color": 0.0,
            "total": 0.0
        }
        
        try:
            if "totalPostProductionCost" in data:
                post_costs["total"] = float(data["totalPostProductionCost"])
            elif "grandTotal" in data:
                post_costs["total"] = float(data["grandTotal"])
            else:
                post_costs["total"] = self._find_largest_numeric_value(data, 9500000)  # 9.5M default
                
        except Exception as e:
            logger.warning(f"Post-production cost extraction failed: {str(e)}")
            post_costs["total"] = 9500000
        
        return post_costs
    
    def _extract_insurance_costs(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract insurance costs"""
        insurance_costs = {
            "general_liability": 0.0,
            "equipment": 0.0,
            "completion_bond": 0.0,
            "total": 0.0
        }
        
        try:
            if "totalInsuranceCost" in data:
                insurance_costs["total"] = float(data["totalInsuranceCost"])
            elif "grandTotal" in data:
                insurance_costs["total"] = float(data["grandTotal"])
            else:
                insurance_costs["total"] = self._find_largest_numeric_value(data, 1800000)  # 1.8M default
                
        except Exception as e:
            logger.warning(f"Insurance cost extraction failed: {str(e)}")
            insurance_costs["total"] = 1800000
        
        return insurance_costs
    
    def _extract_tax_incentives(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract tax incentives"""
        incentives = {
            "uk_tax_relief": 0.0,
            "eady_levy": 0.0,
            "total_benefit": 0.0
        }
        
        try:
            if "totalTaxBenefit" in data:
                incentives["total_benefit"] = float(data["totalTaxBenefit"])
            elif "totalBenefit" in data:
                incentives["total_benefit"] = float(data["totalBenefit"])
            else:
                # Tax incentives are typically negative (benefits)
                incentives["total_benefit"] = self._find_largest_numeric_value(data, -500000)
                
        except Exception as e:
            logger.warning(f"Tax incentive extraction failed: {str(e)}")
            incentives["total_benefit"] = -500000  # 500K benefit
        
        return incentives
    
    def _find_largest_numeric_value(self, data: Dict[str, Any], default: float) -> float:
        """Find the largest numeric value in nested data structure"""
        max_value = 0
        
        def search_dict(obj):
            nonlocal max_value
            if isinstance(obj, dict):
                for value in obj.values():
                    search_dict(value)
            elif isinstance(obj, list):
                for item in obj:
                    search_dict(item)
            elif isinstance(obj, (int, float)):
                if obj > max_value and obj < 50000000:  # Reasonable upper bound
                    max_value = obj
        
        search_dict(data)
        return max_value if max_value > 0 else default
    
    def _calculate_totals(self, costs: Dict[str, Any]) -> Dict[str, float]:
        """Calculate total costs by category"""
        totals = {
            "above_the_line": costs["labor"].get("above_the_line", 0),
            "below_the_line": (
                costs["labor"].get("below_the_line", 0) +
                costs["equipment"].get("total", 0) +
                costs["locations"].get("total", 0)
            ),
            "post_production": costs["post_production"].get("total", 0),
            "insurance": costs["insurance"].get("total", 0),
            "subtotal": 0,
            "tax_benefits": costs["tax_incentives"].get("total_benefit", 0)
        }
        
        totals["subtotal"] = (
            totals["above_the_line"] +
            totals["below_the_line"] +
            totals["post_production"] +
            totals["insurance"]
        )
        
        return totals
    
    def _apply_contingencies(self, totals: Dict[str, float]) -> Dict[str, float]:
        """Apply contingency percentages"""
        contingency_totals = totals.copy()
        
        # Apply contingencies
        atl_contingency = totals["above_the_line"] * self.standard_contingency_rates["above_the_line"]
        btl_contingency = totals["below_the_line"] * self.standard_contingency_rates["below_the_line"]
        post_contingency = totals["post_production"] * self.standard_contingency_rates["post_production"]
        
        contingency_totals["contingencies"] = atl_contingency + btl_contingency + post_contingency
        contingency_totals["grand_total"] = totals["subtotal"] + contingency_totals["contingencies"]
        contingency_totals["net_total"] = contingency_totals["grand_total"] + totals["tax_benefits"]
        
        return contingency_totals
    
    def _generate_budget_structure(
        self, 
        costs: Dict[str, Any], 
        totals: Dict[str, float], 
        contingency_totals: Dict[str, float],
        model_outputs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate final budget structure"""
        
        return {
            "budgetAggregatorOutput": {
                "projectId": "proj_2001_space_odyssey",
                "aggregationTimestamp": datetime.utcnow().isoformat() + "Z",
                "aggregationMethod": "FALLBACK_AGGREGATION",
                "processingEvidence": [
                    {
                        "processName": "Fallback Budget Aggregation",
                        "status": "COMPLETED",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "summary": "Emergency aggregation performed due to main aggregator failure. Extracted costs from individual models and applied standard industry contingencies.",
                        "modelsProcessed": list(model_outputs.keys()),
                        "contingencyRatesApplied": self.standard_contingency_rates
                    }
                ],
                "budgetSummary": {
                    "currency": "USD",
                    "historicalContext": "1965-1968 production period",
                    "aboveTheLineTotal": contingency_totals["above_the_line"],
                    "belowTheLineTotal": contingency_totals["below_the_line"],
                    "postProductionTotal": contingency_totals["post_production"],
                    "insuranceTotal": contingency_totals["insurance"],
                    "subtotal": contingency_totals["subtotal"],
                    "contingencyTotal": contingency_totals["contingencies"],
                    "grandTotal": contingency_totals["grand_total"],
                    "taxBenefits": contingency_totals["tax_benefits"],
                    "netTotal": contingency_totals["net_total"]
                },
                "departmentBreakdown": {
                    "labor": costs["labor"],
                    "equipment": costs["equipment"],
                    "locations": costs["locations"],
                    "postProduction": costs["post_production"],
                    "insurance": costs["insurance"],
                    "taxIncentives": costs["tax_incentives"]
                },
                "qualityIndicators": {
                    "aggregationMethod": "fallback",
                    "dataCompleteness": self._calculate_data_completeness(model_outputs),
                    "costAccuracy": "estimated",
                    "recommendationsForImprovement": [
                        "Fix primary Budget Aggregator JSON parsing issue",
                        "Verify individual model cost outputs for accuracy",
                        "Review contingency rates for project-specific risks"
                    ]
                }
            }
        }
    
    def _calculate_data_completeness(self, model_outputs: Dict[str, Dict[str, Any]]) -> str:
        """Calculate data completeness percentage"""
        expected_models = {
            "coordinator", "laborCostCalculator", "equipmentPricingEngine",
            "locationCostEstimator", "scheduleOptimizer", "insuranceCalculator",
            "postProductionEstimator", "taxIncentiveAnalyzer", "budgetAggregator",
            "cashFlowProjector"
        }
        
        successful_models = set()
        for model_name, output in model_outputs.items():
            if output.get("success", False) and not output.get("error"):
                successful_models.add(model_name)
        
        completeness = len(successful_models) / len(expected_models) * 100
        return f"{completeness:.1f}%"
    
    def _generate_emergency_budget(self, model_outputs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Generate emergency budget when all else fails"""
        logger.error("🚨 EMERGENCY BUDGET: All aggregation methods failed")
        
        # Count successful models
        successful_count = sum(1 for output in model_outputs.values() 
                             if output.get("success", False))
        
        # Estimate based on 2001: A Space Odyssey scale
        estimated_total = 12000000  # 12M base estimate
        
        return {
            "budgetAggregatorOutput": {
                "projectId": "proj_2001_space_odyssey",
                "aggregationTimestamp": datetime.utcnow().isoformat() + "Z",
                "aggregationMethod": "EMERGENCY_ESTIMATE",
                "processingEvidence": [
                    {
                        "processName": "Emergency Budget Estimation",
                        "status": "COMPLETED",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "summary": f"Emergency estimation based on project scale. {successful_count}/{len(model_outputs)} models completed successfully.",
                        "emergencyReason": "All aggregation methods failed"
                    }
                ],
                "budgetSummary": {
                    "currency": "USD",
                    "historicalContext": "1965-1968 production period",
                    "estimatedGrandTotal": estimated_total,
                    "confidenceLevel": "LOW",
                    "warning": "This is an emergency estimate. Fix aggregation issues for accurate budgeting."
                },
                "emergencyMetrics": {
                    "successfulModels": successful_count,
                    "totalModels": len(model_outputs),
                    "completionRate": f"{successful_count/len(model_outputs)*100:.1f}%"
                }
            }
        }