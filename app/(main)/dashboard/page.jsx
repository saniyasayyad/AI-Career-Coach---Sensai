import React from 'react'
import { getUserOnboardingStatus } from '../../../actions/user'; 
import { redirect } from 'next/navigation'; 
import DashboardView from './_components/dashboard-view';

import { getIndustryInsights } from '../../../actions/dashboard.js';

export const dynamic = "force-dynamic";


const IndustryInsightsPage = async() => {
  const onboardingStatus = await getUserOnboardingStatus();
  let insights = null;
  try {
    insights = await getIndustryInsights();
  } catch (error) {
    console.error("Industry insights failed:", error);
    insights = {
      industry: "",
      salaryRanges: [],
      growthRate: 0,
      demandLevel: "MEDIUM",
      topSkills: [],
      recommendedSkills: [],
      marketOutlook: "NEUTRAL",
      keyTrends: [],
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
  }
  // Ensure we have a sane default if no data was returned
  if (!insights) {
    insights = {
      industry: "",
      salaryRanges: [],
      growthRate: 0,
      demandLevel: "MEDIUM",
      topSkills: [],
      recommendedSkills: [],
      marketOutlook: "NEUTRAL",
      keyTrends: [],
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
  }
  
  if (!onboardingStatus?.isOnboarded) {
    redirect('/onboarding');
  }

  return (
    <div className= "container mx-auto mt-10">
       <DashboardView  insights={insights} />
    </div>
  );
};

export default IndustryInsightsPage;