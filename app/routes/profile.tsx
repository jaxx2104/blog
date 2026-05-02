import { createFileRoute } from "@tanstack/react-router"
import ProfileLink from "@/components/features/profile/profile-link"
import ProfileOthers from "@/components/features/profile/profile-others"
import ProfileUser from "@/components/features/profile/profile-user"
import ProfileWork from "@/components/features/profile/profile-work"
import Layout from "@/components/layout/layout"
import { SITE_TITLE, SITE_URL } from "@/lib/site"

const PROFILE_TITLE = `Profile | ${SITE_TITLE}`
const PROFILE_DESCRIPTION = "I'm a front-end engineer in Japan 🗼"
const PROFILE_URL = `${SITE_URL}/profile/`
const PROFILE_IMAGE = "/images/profile.jpg"

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: PROFILE_TITLE },
      { name: "description", content: PROFILE_DESCRIPTION },
      { property: "og:title", content: PROFILE_TITLE },
      { property: "og:description", content: PROFILE_DESCRIPTION },
      { property: "og:url", content: PROFILE_URL },
      { property: "og:image", content: `${SITE_URL}${PROFILE_IMAGE}` },
      { name: "twitter:title", content: PROFILE_TITLE },
      { name: "twitter:description", content: PROFILE_DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}${PROFILE_IMAGE}` },
    ],
    links: [{ rel: "canonical", href: PROFILE_URL }],
  }),
})

function ProfilePage() {
  return (
    <Layout>
      <ProfileUser profileImage={PROFILE_IMAGE} />
      <ProfileLink />
      <ProfileWork />
      <ProfileOthers />
    </Layout>
  )
}
