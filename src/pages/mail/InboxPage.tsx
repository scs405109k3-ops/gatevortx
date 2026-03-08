import React from 'react';
import EmailList from '../../components/mail/EmailList';

const InboxPage: React.FC = () => <EmailList folder="inbox" title="Inbox" />;
export default InboxPage;
