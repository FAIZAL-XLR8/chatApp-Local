import React from 'react'
import useUserStore from '../../store/useUserStore'
const UserProfile = () => {
  const {user} = useUserStore();
  return (
    <div>
      userProfile
      <p/>{user.username}
    </div>
  )
}

export default UserProfile
