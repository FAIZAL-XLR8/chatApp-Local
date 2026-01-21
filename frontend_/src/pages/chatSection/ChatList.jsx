import React, { useState } from 'react'
import useLayoutStore from '../../store/layOutStore';
import useThemeStore from '../../store/theme';
import useUserStore from '../../store/useUserStore';

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const [searchTerms, setSearchTerms] = useState("");

  const filteredContacts = contacts?.filter((contact) =>
    contact?.username
      ?.toLowerCase()
      .includes(searchTerms.toLowerCase())
  );

  return (
    <div
      className={`w-full border-r h-screen ${
        theme === "dark"
          ? "bg-[rgb(17,27,33)] border-gray-600"
          : "bg-white border-gray-300"
      }`}
    >
    </div>
  );
};

export default ChatList;
