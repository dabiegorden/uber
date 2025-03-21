import { View, Text, TouchableOpacity, Image} from 'react-native'
import React, { useRef, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from "expo-router";
import Swiper from "react-native-swiper";
import { welcome } from '@/constants';

const Welcome = () => {
const swiperRef = useRef(null);
const [activeIndex, setActiveIndex] = useState(0)
const isLastSlide = activeIndex === welcome.length - 1;

  return (
    <SafeAreaView className="flex h-full items-center justify-between bg-white">
        <TouchableOpacity 
            className="flex w-full justify-end items-end p-5"
            onPress={() => router.replace('/(auth)/register')}
        >
             <Text className="text-black font-bold">Skip</Text>
        </TouchableOpacity>

        {/* Swiper components */}
        <Swiper
          ref={swiperRef}
          loop={true}
          dot={<View className="w-[32px] h-[4px] mx-1 bg-[#E2E8F0] rounded-full"/>}
          activeDot={<View className="w-[32px] h-[4px] mx-1 bg-[#0286FF] rounded-full"/>}
          onIndexChanged={(index) => setActiveIndex(index)}
          autoplay={true}
          autoplayTimeout={3}
        >
            {welcome.map((item) => {
               const { id, title, description, image } = item;

               return(
                  <View key={id} className="flex justify-center items-center p-5">
                    <Image source={image} className="w-full h-[300px]" resizeMode='contain'/>
                      <View className="flex flex-row items-center justify-center w-full mt-10">
                      <Text key={id} className="text-black text-3xl font-bold mx-10 text-center">
                          {title}
                      </Text>
                      </View>
                      <Text className="text-lg font-semibold text-center text-[#858585] mx-10 mt-3">{description}</Text>
                  </View>
               )
            })}
        </Swiper>

        <TouchableOpacity
            className="flex items-center justify-center w-[70%] bg-blue-600 py-3 px-4 rounded-full shadow-md mb-4 mx-10"
                onPress={() => {
                    if(isLastSlide){
                        router.replace('/(auth)/register')
                    } else {
                        swiperRef.current?.scrollBy(1)
                    }
                }}
            >
            <Text className='text-white'>
                {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            </TouchableOpacity>
    </SafeAreaView>
  )
}

export default Welcome