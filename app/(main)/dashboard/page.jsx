import React from 'react'
import { getUserOnboardingStatus } from '../../../actions/user'; 
import { redirect } from 'next/navigation'; 

const IndustryInsightsPage = async() => {
  try {
    const onboardingStatus = await getUserOnboardingStatus();
    
    if (!onboardingStatus?.isOnboarded) {
      redirect('/onboarding');
    }

  return (
    <div>
        IndustryInsightsPage
    </div>
  );
  } catch (error) {
    console.error("Dashboard error:", error);
    redirect('/onboarding');
  }
};

export default IndustryInsightsPage;