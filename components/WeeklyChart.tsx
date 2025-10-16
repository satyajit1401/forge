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

  // Prepare calories data with color coding
  const caloriesData = dailyData.map(day => {
    const isOver = day.calories > targetCalories;
    const isEmpty = day.calories === 0;
    return {
      value: day.calories,
      label: getDayName(day.date),
      frontColor: isEmpty ? '#E5E7EB' : isOver ? '#F87171' : '#4ADE80',
      topLabelComponent: () => (
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
          {day.calories > 0 ? day.calories : ''}
        </Text>
      ),
    };
  });

  // Prepare protein data with color coding
  const proteinData = dailyData.map(day => {
    const isUnder = day.protein < targetProtein;
    const isEmpty = day.protein === 0;
    return {
      value: day.protein,
      label: getDayName(day.date),
      frontColor: isEmpty ? '#E5E7EB' : isUnder ? '#FBBF24' : '#4ADE80',
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
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
          Daily Calories
        </Text>

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
            showReferenceLine1
            referenceLine1Position={targetCalories}
            referenceLine1Config={{
              color: '#000000',
              thickness: 2,
              type: 'dashed',
              dashWidth: 6,
              dashGap: 3,
              labelText: 'Target',
              labelTextStyle: { fontSize: 11, color: '#000000', fontWeight: 'bold' },
            }}
            showReferenceLine2
            referenceLine2Position={maintenanceCalories}
            referenceLine2Config={{
              color: '#6B7280',
              thickness: 2,
              type: 'dashed',
              dashWidth: 6,
              dashGap: 3,
              labelText: 'Maintenance',
              labelTextStyle: { fontSize: 11, color: '#6B7280', fontWeight: 'bold' },
            }}
          />
        </View>

        {/* Legend */}
        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: '#4ADE80', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Under</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: '#F87171', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Over</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 16, height: 4, backgroundColor: '#000000', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Target</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 16, height: 4, backgroundColor: '#6B7280', borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Maintenance</Text>
          </View>
        </View>
      </View>

      {/* Protein Chart */}
      {targetProtein > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
            Daily Protein
          </Text>

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
              showReferenceLine1
              referenceLine1Position={targetProtein}
              referenceLine1Config={{
                color: '#000000',
                thickness: 2,
                type: 'dashed',
                dashWidth: 6,
                dashGap: 3,
                labelText: 'Target',
                labelTextStyle: { fontSize: 11, color: '#000000', fontWeight: 'bold' },
              }}
            />
          </View>

          {/* Legend */}
          <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#4ADE80', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Met</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#FBBF24', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Below</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 4, backgroundColor: '#000000', borderRadius: 2 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Target</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
