import React, { useEffect, useState } from 'react'
import Layout from './layout'
import ChatList from '../pages/chatSection/ChatList'
import { motion, AnimatePresence } from "framer-motion";
import {getAllUsers} from '../services/loginService'
import useLayoutStore from '../store/layOutStore'
const HomePage = () => {
    const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact,
  );
  const [allUsers, setAllUsers]= useState([]);
  const getUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result.status === 'success') setAllUsers(result.data);
    }catch(error){console.error (error)}
  }
  useEffect (()=>{
    getUsers();
  },[])
  console.log (allUsers);
  return (
    <div>
      <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList contacts = {allUsers}  />  
        {/* ChatLIST SENT as the children component of Layout */}
      </motion.div>
    </Layout>

    </div>
  )
}

export default HomePage
