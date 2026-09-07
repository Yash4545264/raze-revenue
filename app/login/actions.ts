'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error)
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  console.log('Login action success for user:', authData.user?.id);

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup error:', error)
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  // Initialize default merchant policies
  if (authData.user) {
    await supabase.from('merchant_policies').insert({
      id: crypto.randomUUID(),
      merchant_id: authData.user.id,
      max_auto_recovery_amount: 50000,
      max_discount_percentage: 10,
      min_intervention_amount: 100,
    });
  }

  console.log('Signup action success for user:', authData.user?.id);

  revalidatePath('/', 'layout')
  
  // If email confirmation is required, session will be null
  if (!authData.session) {
    redirect('/login?message=Account created! Please check your email to verify your account.')
  }

  redirect('/dashboard')
}
