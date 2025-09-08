"use client";

import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema } from '../../../lib/schema';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';


const onboardingForm = ({industries}) => {

  const [selectedIndustry, setSelectedIndustry] = useState("null");
  const router = useRouter();


    const {
      register,
      handlesubmit,
      formState:{errors},
      setValue,
      watch,
    } = useForm({
      resolver: zodResolver(onboardingSchema),
    });

  return (
    <div className='flex justify-center items-center bg-background'>
    <Card className={"w-full max-w-lg mt-10 mx-2"}>
  <CardHeader>
    <CardTitle className="gradient-title text-4xl">Complete Your Profile</CardTitle>
    <CardDescription>Select your industry to get personalized career insights and recommendation</CardDescription>
    
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>

</Card>
</div>
  );
};

export default onboardingForm