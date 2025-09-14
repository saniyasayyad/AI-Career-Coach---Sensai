"use client";

import { format, formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, LineChart, BriefcaseIcon, Brain } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Progress } from "../../../../components/ui/progress";
import { Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DashboardView = ({ insights }) => {
    const salaryRanges = Array.isArray(insights?.salaryRanges) ? insights.salaryRanges : [];
    const salaryData = salaryRanges.map((range) => ({
        name: range.role,
        min: range.min / 1000,
        max: range.max / 1000,
        median: range.median / 1000,
    }));

    // Add fallback data if no salary data exists
    const fallbackSalaryData = [
        { name: "Software Engineer", min: 70, max: 150, median: 100 },
        { name: "Data Scientist", min: 80, max: 170, median: 115 },
        { name: "Frontend Developer", min: 60, max: 130, median: 90 },
        { name: "Backend Developer", min: 65, max: 140, median: 95 },
        { name: "DevOps Engineer", min: 75, max: 160, median: 110 }
    ];

    const chartData = salaryData.length > 0 ? salaryData : fallbackSalaryData;

    const getDemandLevelColor = (level) => {
        const normalized = typeof level === "string" ? level.toLowerCase() : "";
        switch (normalized) {
            case "high":
                return "bg-green-500";
            case "medium":
                return "bg-yellow-500";
            case "low":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    const getMarketOutlookInfo = (outlook) => {
        const v = typeof outlook === "string" ? outlook.toLowerCase() : "";
        switch (v) {
            case "positive":
                return { icon: TrendingUp, color: "text-green-500" };
            case "neutral":
                return { icon: LineChart, color: "text-yellow-500" };
            case "negative": 
                return { icon: TrendingDown, color: "text-red-500" };
            default: 
                return { icon: LineChart, color: "text-gray-500" };
        }
    };

    const rawOutlook = insights?.marketOutlook;
    const normalizedOutlook = typeof rawOutlook === "string" ? rawOutlook.toUpperCase() : "";
    const displayOutlook = normalizedOutlook === "NEUTRAL" || !normalizedOutlook ? "POSITIVE" : normalizedOutlook;
    const outlookInfo = getMarketOutlookInfo(displayOutlook);
    const OutlookIcon = outlookInfo.icon;
    const outlookColor = outlookInfo.color;

    const lastUpdateDate = insights?.lastUpdated ? format(new Date(insights.lastUpdated), "dd/MM/yyyy") : "-";
    const nextUpdateDistance = insights?.nextUpdate ? formatDistanceToNow(
        new Date(insights.nextUpdate),
        { addSuffix: true }
    ) : "soon";
    const growthRate = typeof insights?.growthRate === "number" ? insights.growthRate : 0;
    const topSkills = Array.isArray(insights?.topSkills) ? insights.topSkills : [];
    const mandatorySkills = ["Python", "Java", "JavaScript", "Cloud Computing", "Agile"];
    const displayedSkills = Array.from(new Set([...mandatorySkills, ...topSkills]));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Badge variant="outline">Last updated: {lastUpdateDate}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Market Outlook</CardTitle>
                        <OutlookIcon className={`h-4 w-4 ${outlookColor}`} />
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard?section=market-outlook" className="text-2xl font-bold">
                            {displayOutlook}
                        </Link>
                        <p className="text-xs text-muted-foreground">Next update {nextUpdateDistance}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Industry Growth</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{growthRate.toFixed(1)}%</div>
                        <Progress value={growthRate} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Demand Level</CardTitle>
                        <BriefcaseIcon className={`h-4 w-4 ${outlookColor}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{insights?.demandLevel || "High"}</div>
                        <div className={`h-2 w-full rounded-full mt-2 ${getDemandLevelColor(insights?.demandLevel)}`} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
                        <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1">
                            {displayedSkills.slice(0, 5).map((skill) => (
                                <Badge key={skill} variant="secondary">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Salary Ranges by Role</CardTitle>
                    <CardDescription>
                        Displaying minimum, median, and maximum salaries (in thousands)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={chartData} 
                                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                barCategoryGap={20}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 12, textAnchor: 'middle' }}
                                    angle={0}
                                    textAnchor="end"
                                    height={100}
                                    interval={0}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    label={{ value: 'Salary (k)', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                                                    <p className="font-medium text-gray-900">{label}</p>
                                                    {payload.map((item, index) => (
                                                        <p key={index} className="text-sm text-gray-600">
                                                            {item.name}: ${item.value}k
                                                        </p>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="min" fill="#A9A9A9" name="Min Salary (k)" />
                                <Bar dataKey="median" fill="#5A7D9A" name="Median Salary (k)" />
                                <Bar dataKey="max" fill="#2E5984" name="Max Salary (k)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Kry Industry Trends</CardTitle>
                    <CardDescription>Current trends shaping the industry
\                    </CardDescription>
                </CardHeader>
                <CardContent> 
                    <ul className="space-y-4">
                        {insights.keyTrends.map((trend, index) => (
                            <li key={trend} className="flex items-start space-x-2">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span>{trend}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recommended Skills</CardTitle>
                    <CardDescription>Skills to consider developing
\                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {insights.recommendedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                                {skill}
                            </Badge>
                        ))}

                    </div>
                 </CardContent>
            </Card>
        </div>
        </div>
    );
};

export default DashboardView;