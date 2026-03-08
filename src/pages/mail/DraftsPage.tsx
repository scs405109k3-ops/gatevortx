import React from 'react';
import EmailList from '../../components/mail/EmailList';

const DraftsPage: React.FC = () => <EmailList folder="drafts" title="Drafts" />;
export default DraftsPage;
