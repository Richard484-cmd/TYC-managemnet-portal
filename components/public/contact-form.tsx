'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Send } from 'lucide-react';

export function ContactForm() {
  const supabase = createClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from('contact_submissions').insert({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      subject,
      message,
      status: 'new',
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
      <Card className="rounded-[30px] border-2 border-[#071B3D] bg-white shadow-[0_22px_60px_rgba(7,27,61,0.13)]">
        <CardContent className="flex flex-col items-center p-12 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
          <h3 className="text-xl font-semibold">Message Sent!</h3>
          <p className="mt-2 text-muted-foreground">
            Thank you for reaching out. We will get back to you as soon as possible.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSuccess(false);
              setFirstName('');
              setLastName('');
              setEmail('');
              setPhone('');
              setSubject('');
              setMessage('');
            }}
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[30px] border-2 border-[#071B3D] bg-white shadow-[0_22px_60px_rgba(7,27,61,0.13)]">
      <CardContent className="p-6 sm:p-10">
        <h3 className="font-serif text-2xl font-semibold text-[#071B3D]">Send Us a Message</h3>
        <p className="mt-2 text-sm leading-6 text-[#667487]">
          Fill out the form below and we will respond as soon as we can.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="firstName">First Name *</Label>
              <Input
                className="h-12 rounded-2xl border-2 border-[#18243A] bg-white px-4 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2.5">
              <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="lastName">Last Name *</Label>
              <Input
                className="h-12 rounded-2xl border-2 border-[#18243A] bg-white px-4 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="email">Email</Label>
              <Input
                className="h-12 rounded-2xl border-2 border-[#18243A] bg-white px-4 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="phone">Phone</Label>
              <Input
                className="h-12 rounded-2xl border-2 border-[#18243A] bg-white px-4 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="subject">Subject *</Label>
            <Input
              className="h-12 rounded-2xl border-2 border-[#18243A] bg-white px-4 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="What is this about?"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="font-serif text-sm font-semibold text-[#071B3D]" htmlFor="message">Message *</Label>
            <Textarea
              className="min-h-36 rounded-2xl border-2 border-[#18243A] bg-white px-4 py-3 text-[#071B3D] shadow-sm transition-colors focus-visible:border-[#F4B942] focus-visible:ring-[#F4B942]/20"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Tell us more..."
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-2xl bg-[#071B3D] font-semibold text-white shadow-lg shadow-[#071B3D]/20 transition-all hover:-translate-y-0.5 hover:bg-[#0A2A5E]" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
