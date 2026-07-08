'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import {
  type OrganizationProfile,
  useOrgProfile,
  useUpdateOrgProfile,
} from '@/lib/hooks/use-org-profile'

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GB: 'GBP',
  IE: 'EUR',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  IN: 'INR',
  ZA: 'ZAR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  CH: 'CHF',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  PL: 'PLN',
  CZ: 'CZK',
  JP: 'JPY',
  SG: 'SGD',
  HK: 'HKD',
  AE: 'AED',
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
// .of() throws RangeError on structurally invalid codes; the API only enforces
// length 2, so profiles written by other clients may hold e.g. "U1".
const regionName = (code: string) =>
  /^[A-Za-z]{2}$/.test(code) ? (regionNames.of(code.toUpperCase()) ?? code) : code
const COUNTRIES = Object.keys(CURRENCY_BY_COUNTRY)
  .map((code) => ({ code, name: regionName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name))

const NO_COUNTRY = 'none'

const profileFormSchema = z.object({
  businessType: z.string().max(120, 'Keep this under 120 characters.'),
  description: z.string().max(2000, 'Keep this under 2000 characters.'),
  goals: z
    .string()
    .refine((value) => splitGoals(value).length <= 8, 'Add up to 8 goals.')
    .refine(
      (value) => splitGoals(value).every((goal) => goal.length <= 120),
      'Keep each goal under 120 characters.',
    ),
  constraints: z.string().max(1000, 'Keep this under 1000 characters.'),
  country: z
    .string()
    .refine((value) => value === '' || /^[A-Za-z]{2}$/.test(value), 'Use a 2-letter country code.'),
  currency: z
    .string()
    .refine(
      (value) => value === '' || /^[A-Za-z]{3}$/.test(value),
      'Use a 3-letter currency code.',
    ),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

function splitGoals(value: string): string[] {
  return value
    .split(',')
    .map((goal) => goal.trim())
    .filter(Boolean)
}

function toFormValues(profile: OrganizationProfile | undefined): ProfileFormValues {
  return {
    businessType: profile?.businessType ?? '',
    description: profile?.description ?? '',
    goals: profile?.goals?.join(', ') ?? '',
    constraints: profile?.constraints ?? '',
    country: profile?.country ?? '',
    currency: profile?.currency ?? '',
  }
}

function toPayload(values: ProfileFormValues): OrganizationProfile {
  const goals = splitGoals(values.goals)
  const country = values.country.trim()
  const currency = values.currency.trim()
  return {
    businessType: values.businessType.trim() || undefined,
    description: values.description.trim() || undefined,
    goals: goals.length ? goals : undefined,
    constraints: values.constraints.trim() || undefined,
    country: country ? country.toUpperCase() : undefined,
    currency: currency ? currency.toUpperCase() : undefined,
  }
}

export function BusinessProfileForm() {
  const query = useOrgProfile()
  const mutation = useUpdateOrgProfile()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(undefined),
  })

  const { reset } = form
  const profile = query.data?.profile
  useEffect(() => {
    if (profile) reset(toFormValues(profile))
  }, [profile, reset])

  if (query.isLoading) {
    return <Skeleton className="h-72 w-full rounded-lg" />
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'forbidden') {
      return <Alert>Only owners and managers can edit the business profile.</Alert>
    }
    return <Alert variant="destructive">Couldn&apos;t load the business profile.</Alert>
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(toPayload(values))
    } catch {
      /* onError toast handles user feedback */
    }
  })

  return (
    <section
      className="rounded-lg border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="business-profile-heading"
    >
      <header className="mb-4">
        <h3 id="business-profile-heading" className="text-sm font-semibold tracking-tight">
          Business profile
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tell GM about your business so it gives advice that fits how you actually operate.
        </p>
      </header>
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="businessType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business type</FormLabel>
                <FormControl>
                  <Input maxLength={120} placeholder="brewpub + taproom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>About your business</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={2000}
                    placeholder="What you serve, who your customers are, what makes the place tick."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goals</FormLabel>
                <FormControl>
                  <Input placeholder="grow taproom revenue, cut COGS, reduce waste" {...field} />
                </FormControl>
                <FormDescription>
                  What you optimise for. Separate goals with commas (up to 8).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="constraints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Constraints</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Hard operating limits — e.g. no late-night service, fixed kitchen hours."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem className="sm:w-56">
                  <FormLabel>Country</FormLabel>
                  <Select
                    value={field.value || NO_COUNTRY}
                    onValueChange={(value) => {
                      const code = value === NO_COUNTRY ? '' : value
                      field.onChange(code)
                      const currency = CURRENCY_BY_COUNTRY[code]
                      if (currency) {
                        form.setValue('currency', currency, { shouldDirty: true })
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_COUNTRY}>Not set</SelectItem>
                      {field.value && !CURRENCY_BY_COUNTRY[field.value] ? (
                        <SelectItem value={field.value}>{regionName(field.value)}</SelectItem>
                      ) : null}
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Sets the default currency.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="sm:w-40">
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input maxLength={3} autoCapitalize="characters" placeholder="USD" {...field} />
                  </FormControl>
                  <FormDescription>3-letter code (optional).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
