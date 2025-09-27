import React from "react"
import Layout from "@/components/layout/layout"
import Meta from "@/components/ui/meta"
import ProfileOthers from "@/components/features/profile/profile-others"
import ProfileUser from "@/components/features/profile/profile-user"
import ProfileWork from "@/components/features/profile/profile-work"
import ProfileLink from "@/components/features/profile/profile-link"

export const metadata = {
  title: "Profile",
  description: "I'm a front-end engineer in Japan 🗼",
}

const ProfilePage: React.FC = () => (
  <Layout>
    <Meta title="Profile" />
    <ProfileUser profileImage="/images/profile.jpg" />
    <ProfileLink />
    <ProfileWork />
    <ProfileOthers />
  </Layout>
)

export default ProfilePage
