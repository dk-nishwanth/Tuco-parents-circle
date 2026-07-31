import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type LegalDoc = 'privacy' | 'terms' | 'guidelines';

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display font-bold text-base text-neutral-800 mt-6 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-600 leading-relaxed mb-3">{children}</p>;
}
function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-600 leading-relaxed mb-3">{children}</ul>;
}

const CONTENT: Record<LegalDoc, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <P>tuco Parents Circle ("we", "us") is a community space for parents. This page explains what we collect and how we use it.</P>
        <H>What we collect</H>
        <List>
          <li>Account info you provide: email address, pen-name, city, and your child's age range.</li>
          <li>Content you post: questions, replies, and any images you upload.</li>
          <li>Basic technical data: IP address and browser info, used for security (e.g. rate-limiting, abuse prevention) and shown to you if you review your own login history.</li>
        </List>
        <H>What we don't do</H>
        <List>
          <li>We never require a phone number or your real name — pen-names keep you anonymous by design.</li>
          <li>We don't sell your data to third parties.</li>
        </List>
        <H>How we use it</H>
        <P>To run the community (show your posts, notify you of replies, let you sign in), to keep it safe (moderation, spam/abuse prevention), and to email you about activity on your threads if you've opted in.</P>
        <H>Your choices</H>
        <P>You can turn off email notifications from your profile settings. To request deletion of your account and data, contact us at the email listed on tucokids.com.</P>
        <H>Contact</H>
        <P>Questions about this policy? Reach out via tucokids.com.</P>
      </>
    ),
  },
  terms: {
    title: 'Terms of Service',
    body: (
      <>
        <P>By using tuco Parents Circle, you agree to these terms.</P>
        <H>Your account</H>
        <P>You're responsible for what you post under your pen-name. Don't share your login, and don't impersonate anyone else.</P>
        <H>Community content</H>
        <P>Content you post remains yours, but you grant us a license to display it within the community so others can see and respond to it. We may remove content that violates our Community Guidelines.</P>
        <H>What's not allowed</H>
        <List>
          <li>Medical advice presented as fact (see a real doctor for that)</li>
          <li>Sharing other people's private information (addresses, phone numbers, school names of children who aren't yours)</li>
          <li>Spam, promotions, or harassment</li>
        </List>
        <H>Moderation</H>
        <P>We use automated checks and human moderators to review posts before they go live in borderline cases. We may remove content or suspend accounts that violate these terms.</P>
        <H>No warranty</H>
        <P>This community is provided as-is. Parenting advice shared here reflects individual experiences, not professional medical, legal, or psychological guidance.</P>
        <H>Changes</H>
        <P>We may update these terms as the community evolves. Continued use after changes means you accept the update.</P>
      </>
    ),
  },
  guidelines: {
    title: 'Community Guidelines',
    body: (
      <>
        <P>tuco Parents Circle works because parents look out for each other. A few ground rules:</P>
        <List>
          <li><strong>Keep it kind & helpful.</strong> Assume good intent, and respond the way you'd want a stranger to respond to your own worried 2am question.</li>
          <li><strong>No medical advice.</strong> Share what worked for you, but always point to a doctor for anything that sounds serious.</li>
          <li><strong>Respect privacy.</strong> Don't post your child's school name, address, or other identifying details — yours or anyone else's.</li>
          <li><strong>No spam or promos.</strong> This isn't the place for affiliate links or product pushing.</li>
          <li><strong>Safe for parents & kids.</strong> No harassment, hate speech, or content that wouldn't be okay for a family space.</li>
        </List>
        <P>Posts that clearly break these rules may be held for review or removed. Repeated violations can lead to account suspension.</P>
      </>
    ),
  },
};

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const navigate = useNavigate();
  const { title, body } = CONTENT[doc];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-neutral-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display font-black text-2xl text-neutral-800 mb-6">{title}</h1>
        <div>{body}</div>
      </div>
    </div>
  );
}
