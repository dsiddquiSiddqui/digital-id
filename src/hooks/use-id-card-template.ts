'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_ID_CARD_TEMPLATE,
  type IdCardTemplate,
} from '@/lib/id-card-template'

type OrganizationBrand = {
  name: string | null
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  surface_color: string | null
}

const EMPTY_ORGANIZATION: OrganizationBrand = {
  name: null,
  logo_url: null,
  primary_color: null,
  accent_color: null,
  surface_color: null,
}

export function useIdCardTemplate() {
  const [template, setTemplate] = useState<IdCardTemplate>(DEFAULT_ID_CARD_TEMPLATE)
  const [organization, setOrganization] = useState<OrganizationBrand>(EMPTY_ORGANIZATION)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch('/api/id-card-template')
        const result = await response.json()

        if (!response.ok || !active) return

        setTemplate({ ...DEFAULT_ID_CARD_TEMPLATE, ...result.template })
        setOrganization({
          name: result.organization?.name || null,
          logo_url: result.organization?.logo_url || null,
          primary_color: result.organization?.primary_color || null,
          accent_color: result.organization?.accent_color || null,
          surface_color: result.organization?.surface_color || null,
        })
      } catch {
        // The safe default keeps the credential usable if branded settings cannot load.
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return { template, organization }
}
