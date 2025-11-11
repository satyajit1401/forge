/**
 * WeeklyChart Component - Weekly Nutrition Charts
 * Uses react-native-gifted-charts for Expo compatibility
 */

import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { DayData } from '@/types';

interface WeeklyChartProps {
  dailyData: DayData[];
  targetCalories: number;
  targetProtein: number;
  maintenanceCalories: number;
}

export default function WeeklyChart({ dailyData, targetCalories, targetProtein, maintenanceCalories }: WeeklyChartProps) {
  if (!dailyData || dailyData.length === 0) {
    return null;
  }

  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(windowWidth - 48, 800); // Account for padding

  // Helper to get day name from date string
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Prepare calories data with asymmetric color coding
  const caloriesData = dailyData.map(day => {
    if (day.calories === 0) {
      return {
        value: day.calories,
        label: getDayName(day.date),
        frontColor: '#E5E7EB',
        topLabelComponent: () => (
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
            {day.calories > 0 ? day.calories : ''}
          </Text>
        ),
      };
    }

    const diff = day.calories - targetCalories;
    const percentDiff = Math.abs(diff / targetCalories) * 100;

    const isDeficit = targetCalories < maintenanceCalories;
    const isSurplus = targetCalories > maintenanceCalories;
    const isAboveTarget = day.calories > targetCalories;
    const isBelowTarget = day.calories < targetCalories;

    // Determine thresholds based on goal direction
    let greenThreshold, yellowThreshold;

    if ((isDeficit && isBelowTarget) || (isSurplus && isAboveTarget)) {
      // Moving in "good" direction - more relaxed
      greenThreshold = 5.0;
      yellowThreshold = 7.5;
    } else {
      // Moving in "bad" direction - strict
      greenThreshold = 2.5;
      yellowThreshold = 5.0;
    }

    let barColor = '#4ADE80'; // green
    if (percentDiff > yellowThreshold) {
      barColor = '#F87171'; // red
    } else if (percentDiff > greenThreshold) {
      barColor = '#FBBF24'; // amber
    }

    return {
      value: day.calories,
      label: getDayName(day.date),
      frontColor: barColor,
      topLabelComponent: () => (
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
          {day.calories > 0 ? day.calories : ''}
        </Text>
      ),
    };
  });

  // Prepare protein data with color coding
  const proteinData = dailyData.map(day => {
    if (day.protein === 0) {
      return {
        value: day.protein,
        label: getDayName(day.date),
        frontColor: '#E5E7EB',
        topLabelComponent: () => (
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
            {day.protein > 0 ? `${Math.round(day.protein * 10) / 10}g` : ''}
          </Text>
        ),
      };
    }

    // Calculate percentage below target
    const percentBelow = ((targetProtein - day.protein) / targetProtein) * 100;

    let barColor = '#4ADE80'; // green - at or above target
    if (percentBelow > 5.0) {
      barColor = '#F87171'; // red - more than 5% below
    } else if (percentBelow > 0) {
      barColor = '#FBBF24'; // amber - 0-5% below
    }

    return {
      value: day.protein,
      label: getDayName(day.date),
      frontColor: barColor,
      topLabelComponent: () => (
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
          {day.protein > 0 ? `${Math.round(day.protein * 10) / 10}g` : ''}
        </Text>
      ),
    };
  });

  return (
    <View style={{ gap: 16 }}>
      {/* Calories Chart */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 6 }}>
            Daily Calories
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Target: <Text style={{ fontWeight: '600', color: '#111827' }}>{targetCalories}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>•</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Maintenance: <Text style={{ fontWeight: '600', color: '#111827' }}>{maintenanceCalories}</Text>
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <BarChart
            data={caloriesData}
            width={chartWidth - 32}
            height={300}
            barWidth={Math.min((chartWidth - 100) / 7, 60)}
            spacing={Math.max((chartWidth - 100) / 14, 20)}
            roundedTop
            roundedBottom={false}
            noOfSections={5}
            yAxisThickness={1}
            xAxisThickness={1}
            yAxisColor="#E5E7EB"
            xAxisColor="#E5E7EB"
            yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 12 }}
            hideRules
            showGradient={false}
            isAnimated
            animationDuration={300}
          />
        </View>

        {/* Legend */}
        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: '#4ADE80', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>On Track</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: '#FBBF24', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Almost There</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: '#F87171', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Off Track</Text>
          </View>
        </View>
      </View>

      {/* Protein Chart */}
      {targetProtein > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 6 }}>
              Daily Protein
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Target: <Text style={{ fontWeight: '600', color: '#111827' }}>{targetProtein}g</Text>
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <BarChart
              data={proteinData}
              width={chartWidth - 32}
              height={300}
              barWidth={Math.min((chartWidth - 100) / 7, 60)}
              spacing={Math.max((chartWidth - 100) / 14, 20)}
              roundedTop
              roundedBottom={false}
              noOfSections={5}
              yAxisThickness={1}
              xAxisThickness={1}
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
              xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 12 }}
              hideRules
              showGradient={false}
              isAnimated
              animationDuration={300}
            />
          </View>

          {/* Legend */}
          <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#4ADE80', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>On Track</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#FBBF24', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Almost There</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#F87171', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Off Track</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
