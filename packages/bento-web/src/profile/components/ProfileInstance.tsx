import dedent from 'dedent';
import { AnimatePresence, HTMLMotionProps, motion } from 'framer-motion';
import Link from 'next/link';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import CheckCircleIcon from '@/assets/icons/ic-check-circle.svg';
import { Modal } from '@/components/Modal';

import { ProfileEditButton } from '../ProfileDetailPage/components/ProfileEditButton';
import { ProfileImage } from '../ProfileDetailPage/components/ProfileImage';
import { ProfileLinkSection } from '../ProfileDetailPage/components/ProfileLinkSection';
import { QuestionSection } from '../ProfileDetailPage/components/QuestionSection';
import { StickyTab } from '../ProfileDetailPage/components/StickyTab';
import { Palette, usePalette } from '../ProfileDetailPage/hooks/usePalette';
import { UserProfile } from '../types/UserProfile';

const data = {
  color: '#39e27d',
  background: dedent`
    radial-gradient(
      73.41% 194.47% at 0% -2.27%,
      #39e27d 0%,
      #90cff1 100%
    )
  `,
};

enum AddressProfileTab {
  Links = 'Links',
  Questions = 'Questions',
  Assets = 'Assets',
}
const tabs = [
  AddressProfileTab.Links,
  AddressProfileTab.Questions,
  AddressProfileTab.Assets,
];

type ProfileInstanceProps = {
  profile: UserProfile;
  isPreview?: boolean;
};

export const ProfileInstance: React.FC<ProfileInstanceProps> = ({
  profile,
  isPreview,
}) => {
  const [isProfileImageModalVisible, setProfileImageModalVisible] =
    useState<boolean>(false);

  const [selectedTab, setSelectedTab] = useState<AddressProfileTab>(
    AddressProfileTab.Links,
  );

  const palette = usePalette(data.color);
  const profileImageURL = profile.images[0];

  return (
    <React.Fragment>
      <BackgroundGradient style={{ background: data.background }}>
        <ProfileImageContainer>
          <ClickableProfileImage
            source={profileImageURL}
            onClick={() => setProfileImageModalVisible((value) => !value)}
          />
        </ProfileImageContainer>
      </BackgroundGradient>
      <ProfileImageBottomSpacer />
      <Information>
        {!isPreview && (
          <Link href="/profile/edit" passHref>
            <a>
              <ProfileEditButton />
            </a>
          </Link>
        )}
        <DisplayName>{profile.displayName ?? profile.username}</DisplayName>
        <Username style={{ color: palette.primary }}>
          {`@${profile.username}`}
        </Username>
        <Bio>{profile.bio}</Bio>
        <PrimaryArchievement>
          <CheckCircleIcon color={palette.primary} />
          <span>
            Early holder of{' '}
            <PrimaryArchievementLink style={{ color: palette.primary }}>
              CloneX
            </PrimaryArchievementLink>
          </span>
        </PrimaryArchievement>
      </Information>
      <InformationSpacer />
      <Modal
        visible={isProfileImageModalVisible}
        onDismiss={() => setProfileImageModalVisible((value) => !value)}
      >
        <LargeProfileImage src={profileImageURL} />
      </Modal>
      <StickyTab
        selected={selectedTab}
        items={tabs}
        onChange={(tab) => setSelectedTab(tab)}
        primaryColor={palette.primary}
        shadowColor={palette.primaryShadow}
      />
      <AnimatePresence initial={false}>
        <TabContent palette={palette}>
          {selectedTab === AddressProfileTab.Links && (
            <AnimatedTab>
              <ProfileLinkSection items={profile.links} />
            </AnimatedTab>
          )}
          {selectedTab === AddressProfileTab.Questions && (
            <AnimatedTab>
              <QuestionSection />
            </AnimatedTab>
          )}
        </TabContent>
      </AnimatePresence>
    </React.Fragment>
  );
};

const BackgroundGradient = styled.div`
  height: 220px;
  position: relative;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
`;

const ProfileImageContainer = styled.div`
  position: absolute;
  bottom: -32px;
  left: 0;
  right: 0;
  height: 128px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const ProfileImageBottomSpacer = styled.div`
  width: 100%;
  height: 48px;
`;
const ClickableProfileImage = styled(ProfileImage)`
  cursor: pointer;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
`;

const Information = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const DisplayName = styled.h1`
  margin: 0;
  font-weight: 900;
  font-size: 28px;
  line-height: 34px;
  text-align: center;
  color: #ffffff;
`;

const Username = styled.p`
  margin: 4px 0 0;
  font-size: 16px;
  line-height: 19px;
  text-align: center;
`;

const Bio = styled.p`
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 22px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  white-space: break-spaces;
`;

const PrimaryArchievement = styled.div`
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  & > span {
    margin-left: 4px;
    font-size: 16px;
    line-height: 19px;
    text-align: center;
    color: #78797f;
  }
`;
const PrimaryArchievementLink = styled.a`
  text-decoration-line: underline;
`;

const InformationSpacer = styled.div`
  width: 100%;
  height: 26px;
`;

const LargeProfileImage = styled.img`
  max-width: 500px;
  width: 85vw;
  aspect-ratio: 1;
  border-radius: 50%;
`;

type TabContentProps = {
  palette: Palette;
};
const TabContent = styled.div<TabContentProps>`
  padding: 16px 20px 0;

  button.submit {
    color: rgba(23, 27, 32, 0.75);

    &:active {
      opacity: 0.65;
    }

    ${({ palette }) => css`
      background-color: ${palette.primary};
      box-shadow: 0 8px 16px ${palette.primaryShadow};
      text-shadow: 2px 2px 4px ${palette.darkShadow};

      &:hover {
        background-color: ${palette.dark};
        box-shadow: 0 4px 16px ${palette.darkShadow};
        transform: scale(1.05);
      }
    `};
  }
`;

const AnimatedTab = (props: HTMLMotionProps<'div'>) => (
  <motion.div
    initial={{ opacity: 0, transform: 'scale(0.9)' }}
    animate={{ opacity: 1, transform: 'scale(1)' }}
    exit={{ opacity: 0, transform: 'scale(0.9)' }}
    style={{ originY: 0 }}
    transition={{ duration: 0.35 }}
    {...props}
  />
);
