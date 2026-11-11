'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface EventRegistrationFormProps {
  eventId: string;
}

export function EventRegistrationForm({ eventId }: EventRegistrationFormProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [numGuests, setNumGuests] = useState('1');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from('event_registrations').insert({
      event_id: eventId,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      num_guests: parseInt(numGuests, 10) || 1,
      status: 'registered',
    });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
          <h3 className="text-xl font-semibold">Registration Confirmed!</h3>
          <p className="mt-2 text-muted-foreground">
            We look forward to seeing you at the event. A confirmation email will be sent if you provided an email address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold">Register for this Event</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill out the form below to secure your spot.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              max="10"
              value={numGuests}
              onChange={(e) => setNumGuests(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Register Now
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
