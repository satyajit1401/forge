/**
 * Totals Component - Daily Macro Progress
 * Displays calories and protein progress with SVG donut charts
 */

import React from 'react';
import type { FoodEntry } from '@/types';

interface TotalsProps {
  entries: FoodEntry[];
  targetCalories: number;
  targetProtein: number;
}

export default function Totals({ entries, targetCalories, targetProtein }: TotalsProps) {
  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0)
    }),
    { calories: 0, protein: 0 }
  );

  const caloriePercentage = targetCalories > 0 ? Math.min((totals.calories / targetCalories) * 100, 100) : 0;
  const proteinPercentage = targetProtein > 0 ? Math.min((totals.protein / targetProtein) * 100, 100) : 0;

  // SVG donut chart settings
  const size = 60;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const getStrokeDashoffset = (percentage: number) => {
    return circumference - (percentage / 100) * circumference;
  };

  const getCalorieColor = () => {
    const fullPercentage = targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
    if (fullPercentage > 100) return '#EF4444'; // red-500
    if (fullPercentage > 90) return '#F59E0B'; // amber-500
    return '#10A37F'; // OpenAI green
  };

  const getProteinColor = () => {
    const fullPercentage = targetProtein > 0 ? (totals.protein / targetProtein) * 100 : 0;
    if (fullPercentage >= 100) return '#10A37F'; // OpenAI green
    if (fullPercentage >= 80) return '#10A37F'; // OpenAI green
    return '#F59E0B'; // amber-500
  };

  return (
    <div className="flex items-center justify-center gap-6">
          {/* Calories Donut */}
          <div className="flex items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={getCalorieColor()}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={getStrokeDashoffset(caloriePercentage)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">{Math.round(caloriePercentage)}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Calories</div>
              <div className="text-sm font-bold text-gray-900">{totals.calories}</div>
              <div className="text-xs text-gray-500">of {targetCalories}</div>
            </div>
          </div>

          {/* Protein Donut */}
          <div className="flex items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={getProteinColor()}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={getStrokeDashoffset(proteinPercentage)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">{Math.round(proteinPercentage)}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-medium">Protein</div>
              <div className="text-sm font-bold text-gray-900">{Math.round(totals.protein * 10) / 10}g</div>
              <div className="text-xs text-gray-500">of {targetProtein}g</div>
            </div>
          </div>
        </div>
  );
}
