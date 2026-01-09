# Re:FW:FW: RE: 복합동 FDCS자료 공유드립니다.

- **From**: 이동혁 [소장] [EPC팀]
- **Date**: 2023-10-27 14:00:10
- **Source**: Re_FW_FW_ RE_ 복합동 FDCS자료 공유드립니다_.msg

---

안녕하세요? 서성현 수석님

센구조 이동혁 소장입니다.

우선 PSRC 기둥 SR-COM Ratio 작성시 서식 오류가 있어 

 

지적하신것과 같이 SR-COM = SR-Axial로 적용어 있어서 수정하여 다시 송부드립니다. 

 

혼선을 드려 죄송합니다.

 

SR-Ratio 산출 기준은 아래와 같습니다.

< 기 접수된  구조 DB 작성 양식 >  

|  |  |
| --- | --- |
| SR-AXL | 부재응력비 - 축력 |
| SR-MOM | 부재응력비 - 모멘트 |
| SR-COM | 부재응력비 - 조합응력 고려항,(2020.0.27 수정, RC기둥의 경우 Moment와 축력 값 Ratio중 큰값, 철골설계시는 부재 design ratio 입력), 축력+모멘트 (2020.02.26 추가-철골부재 설계시 고려사항) |
| SR-SHR | 부재응력비 - 전단 |

\* PSRC 작성시 SR-Ratio  < 기둥 P-M Curve 고려 >

SR-AXL   :  Axial capacity Ratio ( Pu/ΦPnx , Pu/ΦPny ) 중 큰 값.

SR-MOM :  Biaxial capacity Ratio - Mux/ΦMnx+Muy/ΦMny  2축휨 고려 

SR-COM :  기존 Axial capacity Ratio  수정 -->  ( Axial capacity Ratio , Biaxial capacity Ratio ) 중 큰 값

SR-SHR :  Shear force ratio ( Vux/ΦsVnx , Vux/ΦsVnx ) 중 큰 값.

PSRC 산출방식이 구조DB 요청된 의도와 차이가 있다면 의견 주시면 반영하여 다시 송부드리겠습니다.

요청하신 PSRC 기둥 계산근거도 함께 첨부하였습니다.

궁금하신 사항있으면 연락주세요.

확인 부탁드립니다.

감사합니다.

 

--------------------------------------------------------------------------------------------------------------------------------------------------------

|  |  |
| --- | --- |
| 이동혁   EPC | 소장 | senkuzo |

|  |  |
| --- | --- |
| t: 02-2629-3104  m: 010-4249-7140  e: dhlee@senkuzo.com  www.senkuzo.com | (주)센구조연구소 SEN ENGINEERING GROUP 07226 서울시 영등포구 버드나루로 19길 6 (센스빌딩) |

**------ Original Message ------**  
**Date:** 2023-10-26 16:59:33  
**From:**이인호 [이사] [epc팀] < ihlee@senkuzo.com >  
**To:** team epc < epc@senvex.net >  
**Subject:** FW:FW: RE: 복합동 FDCS자료 공유드립니다.

이인호 이사/ EPC 팀

**T** 02-2629-2619 **M** 010-3106-3005

**F** 02-2629-2600 **H** [www.senkuzo.com](http://www.senkuzo.com/)

07226 서울시 영등포구 버드나루로 19길 6 (당산동 SENSE빌딩)

SENSE B/D Beodeunaru-ro 19-gil 6, Youngdeungpo-gu, Seoul, 07226, Korea

|  |
| --- |
| **(주)센구조연구소** |

|  |
| --- |
| **(주)센벡스** |

|  |
| --- |
| **(주)센코어테크** |

**------ Original Message ------**  
**Date:** 2023-10-26 15:47:51  
**From:**서성현 < sunghyun.seo@samsung.com >  
**To:** 이인호 [이사] [epc팀] < ihlee@senkuzo.com >,endmall01 < endmall.01@partner.samsung.com >  
**Cc:** endmall02 < endmall.02@partner.samsung.com >,senkuzo02 < senkuzo.02@partner.samsung.com >,senkuzo01 < senkuzo.01@partner.samsung.com >,강상규 < sk-.kang@samsung.com >,김준영 < jy0923.kim@samsung.com >,강정호 < joungho.kang@samsung.com >   
**Subject:** FW: RE: 복합동 FDCS자료 공유드립니다.

수신 : 이동혁 소장님

 

아래 발주처 요청사항 회신자료 송부 바랍니다.

 

--------- **Original Message** ---------

**Sender** : 김태균 <tkk.kim@samsung.com>건설기획그룹(글로벌 제조&인프라총괄)/삼성전자

**Date**   : 2023-10-26 15:42 (GMT+9)

**Title**  : RE: 복합동 FDCS자료 공유드립니다.

 

안녕하세요 건설기획그룹 김태균입니다.

 

이경수 그룹장님, 서성현 AE님.

PSRC 및 LFC 기둥에 대한 SR-Ratio 산출 기준 및 계산서 샘플 공유부탁드립니다.

 

FAB 11F H-형강은 AISC Steel 계산식으로 계산된것으로 보입니다.

그러나 PSRC 및 LFC는 콘크리트 P-M Curve 로 예상되나,

LFC의 경우 SR-COM = SR-MOM 으로 산출하였고 PSRC는 SR-COM = SR-Axial로 산출하였습니다.

 

따라서 각 부재에 대한 산출 기준 및 샘플 계산서 공유부탁드립니다.

 

감사합니다.

  

--------- **Original Message** ---------

**Sender** : 이경수 <ks1838.lee@samoo.com> EM/그룹장/하이테크3본부/삼우종합건축사사무소

**Date**   : 2023-10-26 13:37 (GMT+9)

**Title**  : 복합동 FDCS자료 공유드립니다.

 

안녕하세요. 김태균프로님

삼우설계 이경수마스터입니다. 

첨부와 같이, 엔지니어링의 서성현수석님께서 제공해준 복합동 FDCS자료 공유드립니다. 

내용 검토부탁드립니다.

이경수올림

 

 

 

 

 

 

|  |  |
| --- | --- |
|  | **Sung Hyun, Seo** |
| **Principal Engineer** ㅣ 건축구조기술사 ㅣ Industrial Engineering Dept. |
| **Samsung Engineering Co., Ltd.** |
| T  82 2 2053 3670     M  82 10 9984 4428     E  [sunghyun.seo](mailto:sunghyun.seo@samsung.com)[@samsung.com](mailto:sunghyun.seo@samsung.com) |

 

 

 

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |
