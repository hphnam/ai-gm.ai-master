'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { SettingCard } from '@/components/ui/setting-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import {
  type OrganizationProfile,
  useGenerateOrgDescription,
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

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })
const currencyName = (code: string) =>
  /^[A-Za-z]{3}$/.test(code) ? (currencyNames.of(code.toUpperCase()) ?? code) : code
const CURRENCIES = Array.from(new Set(Object.values(CURRENCY_BY_COUNTRY)))
  .map((code) => ({ code, name: currencyName(code) }))
  .sort((a, b) => a.code.localeCompare(b.code))

const NO_COUNTRY = 'none'
const NO_CURRENCY = 'none'

const CARD_TITLE = 'Business profile'
const CARD_DESCRIPTION =
  'Tell GM about your business so it gives advice that fits how you actually operate.'

const profileFormSchema = z.object({
  businessType: z.string().max(120, 'Keep this under 120 characters.'),
  description: z.string().max(2000, 'Keep this under 2000 characters.'),
  goals: z
    .array(z.string().max(120, 'Keep each goal under 120 characters.'))
    .max(8, 'Add up to 8 goals.'),
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

function toFormValues(profile: OrganizationProfile | undefined): ProfileFormValues {
  return {
    businessType: profile?.businessType ?? '',
    description: profile?.description ?? '',
    goals: profile?.goals ?? [],
    constraints: profile?.constraints ?? '',
    country: profile?.country ?? '',
    currency: profile?.currency ?? '',
  }
}

function toPayload(values: ProfileFormValues): OrganizationProfile {
  const goals = values.goals.map((goal) => goal.trim()).filter(Boolean)
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
  const generateDescription = useGenerateOrgDescription()
  const [goalDraft, setGoalDraft] = useState('')
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
    return (
      <SettingCard title={CARD_TITLE} description={CARD_DESCRIPTION}>
        <div className="flex flex-col gap-4">
          {['a', 'b', 'c', 'd'].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </SettingCard>
    )
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'forbidden') {
      return <Alert>Only owners and managers can edit the business profile.</Alert>
    }
    return <Alert variant="destructive">Couldn&apos;t load the business profile.</Alert>
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const pending = goalDraft.trim()
    const goals =
      pending && values.goals.length < 8 && !values.goals.includes(pending)
        ? [...values.goals, pending]
        : values.goals
    if (goals !== values.goals) setGoalDraft('')
    try {
      await mutation.mutateAsync(toPayload({ ...values, goals }))
    } catch {
      /* onError toast handles user feedback */
    }
  })

  return (
    <SettingCard title={CARD_TITLE} description={CARD_DESCRIPTION}>
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
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>About your business</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    disabled={generateDescription.isPending}
                    onClick={async () => {
                      try {
                        const result = await generateDescription.mutateAsync()
                        form.setValue('description', result.description, { shouldDirty: true })
                      } catch {
                        /* onError toast handles user feedback */
                      }
                    }}
                  >
                    {generateDescription.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {field.value.trim() ? 'Rewrite with AI' : 'Generate with AI'}
                  </Button>
                </div>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={2000}
                    placeholder="What you serve, who your customers are, what makes the place tick."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  GM uses this to understand your business. Generate a draft from what we know, then
                  edit.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="goals"
            render={({ field }) => {
              const addGoal = () => {
                const goal = goalDraft.trim()
                if (!goal || field.value.length >= 8 || field.value.includes(goal)) return
                field.onChange([...field.value, goal])
                setGoalDraft('')
              }
              const removeGoal = (index: number) => {
                field.onChange(field.value.filter((_, i) => i !== index))
              }
              return (
                <FormItem>
                  <FormLabel>Goals</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        value={goalDraft}
                        onChange={(event) => setGoalDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addGoal()
                          }
                        }}
                        maxLength={120}
                        placeholder="grow taproom revenue"
                        disabled={field.value.length >= 8}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addGoal}
                      disabled={!goalDraft.trim() || field.value.length >= 8}
                      aria-label="Add goal"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {field.value.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-2">
                      {field.value.map((goal, index) => (
                        <li
                          key={goal}
                          className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 break-words">{goal}</span>
                          <button
                            type="button"
                            onClick={() => removeGoal(index)}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={`Remove ${goal}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <FormDescription>
                    What you optimise for. Add up to 8 ({field.value.length}/8).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
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
                <FormItem className="sm:w-56">
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={field.value || NO_CURRENCY}
                    onValueChange={(value) => field.onChange(value === NO_CURRENCY ? '' : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CURRENCY}>Not set</SelectItem>
                      {field.value && !CURRENCIES.some((c) => c.code === field.value) ? (
                        <SelectItem value={field.value}>{currencyName(field.value)}</SelectItem>
                      ) : null}
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Default currency for figures.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="shadow-[0_2px_0_var(--brass-shadow)]"
            >
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Form>
    </SettingCard>
  )
}
