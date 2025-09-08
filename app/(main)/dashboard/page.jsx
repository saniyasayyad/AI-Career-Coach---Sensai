import React from 'react'
import { getUserOnboardingStatus } from '../../../actions/user'; 
import { redirect } from 'next/navigation'; 
const IndustryInsightsPage = async() => {
  const onboardingStatus = await getUserOnboardingStatus();
  
  if (!isOnboarded) {
    redirect('/onboarding');
  }

  return (
    <div>
        IndustryInsightsPage
    </div>
  );
};

export default IndustryInsightsPage;