'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPage } from '@/components/ProtectedPage';
import { BarChart, BarChart3, LineChart, PieChart, TrendingUp, Users, DollarSign, Building, Calendar, Download, Filter } from 'lucide-react';

interface AnalyticsData {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacancyRate: number;
  totalRevenue: number;
  averageRent: number;
  maintenanceRequests: number;
  activeLeases: number;
  expiringLeases: number;
  newVisitors: number;
}

function AnalyticsPageContent() {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock analytics data - replace with API call
    setTimeout(() => {
      setAnalyticsData({
        totalProperties: 12,
        totalUnits: 250,
        occupiedUnits: 198,
        vacancyRate: 20.8,
        totalRevenue: 485000,
        averageRent: 1940,
        maintenanceRequests: 45,
        activeLeases: 198,
        expiringLeases: 23,
        newVisitors: 156,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const occupancyRate = analyticsData ? ((analyticsData.occupiedUnits / analyticsData.totalUnits) * 100).toFixed(1) : '0';
  const revenuePerUnit = analyticsData ? (analyticsData.totalRevenue / analyticsData.occupiedUnits).toFixed(0) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground">Property Analytics</h1>
            <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download size={16} className="mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                    <p className="text-2xl font-bold">{analyticsData?.totalProperties}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                    <p className="text-2xl font-bold">{analyticsData?.totalUnits}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Building className="text-purple-600" size={24} />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-green-600">{occupancyRate}%</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="text-green-600" size={24} />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">${analyticsData?.totalRevenue?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="text-green-600" size={24} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <BarChart size={20} className="mr-2" />
                  Revenue Trends
                </h3>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-full h-full" />
                    <p className="text-sm mt-2">Revenue chart will be displayed here</p>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <PieChart size={20} className="mr-2" />
                  Property Distribution
                </h3>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-full h-full" />
                    <p className="text-sm mt-2">Property distribution chart</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">Property Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Rent</span>
                    <span className="font-bold">${analyticsData?.averageRent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue/Unit</span>
                    <span className="font-bold">${revenuePerUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Vacancy Rate</span>
                    <span className="font-bold text-yellow-600">{analyticsData?.vacancyRate}%</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">Maintenance Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Open Requests</span>
                    <span className="font-bold">{analyticsData?.maintenanceRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                    <span className="font-bold">2.3 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Emergency Requests</span>
                    <span className="font-bold text-red-600">3</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">Visitor Analytics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Visitors (30d)</span>
                    <span className="font-bold">{analyticsData?.newVisitors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Leases</span>
                    <span className="font-bold">{analyticsData?.activeLeases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expiring Leases</span>
                    <span className="font-bold text-yellow-600">{analyticsData?.expiringLeases}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminPage>
      <AnalyticsPageContent />
    </AdminPage>
  );
}
