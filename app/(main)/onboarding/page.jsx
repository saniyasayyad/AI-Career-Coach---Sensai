import React from 'react'
import { getUserOnboardingStatus } from '../../../actions/user'

const OnboardingPage= async() =>{

    // Not onboard the  redirect to onboarding page
    const {isOnboarded} = await getUserOnboardingStatus();

    if (isOnboarded) {
        // Redirect to dashboard if already onboarded
        redirect('/dashboard');
    }
  return (
    <main>

        <OnboardingForm industries={industries}/>
    </main>
  )
}

export default OnboardingPage;