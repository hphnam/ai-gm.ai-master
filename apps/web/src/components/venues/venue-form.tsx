'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import type { CreateVenueBodyDto as CreateVenueBody } from '@/generated/api'
import { VenuesControllerCreateBody as CreateVenueBodySchema } from '@/generated/zod'
import { useCreateVenue } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'

export function VenueForm() {
  const router = useRouter()
  const createVenue = useCreateVenue()

  const form = useForm<CreateVenueBody>({
    resolver: zodResolver(CreateVenueBodySchema),
    defaultValues: { name: '', type: '', address: '', timezone: 'Europe/London' },
  })

  async function onSubmit(values: CreateVenueBody) {
    try {
      const venue = await createVenue.mutateAsync(values)
      toast.success(`Created ${venue.name}`)
      router.push('/chat')
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createVenue.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="The Crown" disabled={submitting} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Input {...field} placeholder="pub, restaurant, bar, cafe…" disabled={submitting} />
              </FormControl>
              <FormDescription>Free-form. Used as context for the AI.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="14 High Street, London SW1A 1AA"
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Europe/London" disabled={submitting} />
              </FormControl>
              <FormDescription>
                IANA timezone (e.g. Europe/London, America/New_York).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              'Create venue'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
