import React from "react"
import { graphql } from "gatsby"
import { IGatsbyImageData } from "gatsby-plugin-image"
import { siteMetadata } from "../../gatsby-config"
import Layout from "../containers/templates/layout"
import Meta from "../components/meta"
import ProfileOthers from "../containers/profile/profile-others"
import ProfileUser from "../containers/profile/profile-user"
import ProfileWork from "../containers/profile/profile-work"
import ProfileLink from "../containers/profile/profile-link"

interface Props {
  data: GatsbyTypes.ProfilePageQuery
}

const ProfilePage: React.FC<Props> = ({ data }: Props) => (
  <Layout>
    <Meta site={siteMetadata} title="Profile" />
    <ProfileUser profile={data.profile?.childImageSharp?.gatsbyImageData} />
    <ProfileLink />
    <ProfileWork
      kawaii={data.kawaii?.childImageSharp?.gatsbyImageData}
      mockup1={data.mockup1?.childImageSharp?.gatsbyImageData}
      mockup2={data.mockup2?.childImageSharp?.gatsbyImageData}
      mockup3={data.mockup3?.childImageSharp?.gatsbyImageData}
      work1={data.work1?.childImageSharp?.gatsbyImageData}
      work2={data.work2?.childImageSharp?.gatsbyImageData}
    />
    <ProfileOthers />
  </Layout>
)

export default ProfilePage

export const query = graphql`
  query ProfilePage {
    profile: file(name: { eq: "profile" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    kawaii: file(name: { eq: "kawaii" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    mockup1: file(name: { eq: "mockup1" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    mockup2: file(name: { eq: "mockup2" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    mockup3: file(name: { eq: "mockup3" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    work1: file(name: { eq: "work1" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
    work2: file(name: { eq: "work2" }) {
      childImageSharp {
        gatsbyImageData(width: 700, layout: FULL_WIDTH, placeholder: TRACED_SVG)
      }
    }
  }
`
