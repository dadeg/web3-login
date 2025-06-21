'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { HeightIcon } from "@radix-ui/react-icons"
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AbstractProvider, JsonRpcSigner, TransactionRequest, ethers }from 'ethers';
import { useEffect, useState } from 'react';

const apiUrl = "http://localhost:3001";

export default function Home() {
  const [userAddress, setUserAddress] = useState<string|null>(null);
  const [provider, setProvider] = useState<AbstractProvider|null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner|null>(null);

  function refreshAuth() {
    fetch(`${apiUrl}/auth-info`, { credentials: 'include' }).then(result => result.json()).then(json => {
      if (json.address) {
        setUserAddress(json.address);
      }
    });
  }
  useEffect(() => {
    refreshAuth();
  }, [])

  async function logout() {
    fetch(`${apiUrl}/logout`, { credentials: 'include' }).then(result => {
      setUserAddress(null);
    });

  }

  async function getProviderAndSigner(): Promise<[AbstractProvider, JsonRpcSigner]> {
    let newSigner = null;

    let newProvider;
    // @ts-ignore
    if (window.ethereum == null) {

    // If MetaMask is not installed, we use the default provider,
    // which is backed by a variety of third-party services (such
    // as INFURA). They do not have private keys installed,
    // so they only have read-only access
    console.log("MetaMask not installed; using read-only defaults")
    newProvider = ethers.getDefaultProvider()

    } else {

    // Connect to the MetaMask EIP-1193 object. This is a standard
    // protocol that allows Ethers access to make all read-only
    // requests through MetaMask.
    // @ts-ignore
    newProvider = new ethers.BrowserProvider(window.ethereum)
    // It also provides an opportunity to request access to write
    // operations, which will be performed by the private key
    // that MetaMask manages for the user.
    newSigner = await newProvider.getSigner();
    }

    if (!newSigner) {
      throw new Error("signer not found.");
    }

    setProvider(newProvider);
    setSigner(newSigner);
    return [newProvider, newSigner];
  }
  async function login() {
    const result = await fetch(`${apiUrl}/login-secret`);
    const json = await result.json();

    const [newProvider, newSigner] = await getProviderAndSigner();

    const signed = await newSigner.signMessage(json.secret);
    if (!signed) {
      return;
    }
    const verificationResult = await fetch(`${apiUrl}/verify-login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalMessage: json.secret,
        signedMessage: signed
      })
    });
    const verificationJson = await verificationResult.json();
    console.log(verificationResult, verificationJson);
    setUserAddress(verificationJson.address);
  }

  async function getSignerForTx() {
    let signerToUse = signer;
    if (!signerToUse) {
      const [newProvider, newSigner] = await getProviderAndSigner();
      signerToUse = newSigner;
    }
    return signerToUse;
  }

  return (
    <>
      <Collapsible defaultOpen={true}>
        <div className='flex flex-between'>
          <CollapsibleTrigger className="flex items-left justify-left gap-4 px-4"><h1>My App </h1><HeightIcon style={{marginTop: '8px', cursor: 'pointer'}} /></CollapsibleTrigger>
          {userAddress ? <Button style={{cursor: 'pointer'}} onClick={logout}>Log out</Button> : <Button style={{cursor: 'pointer'}} onClick={login}>Log in</Button> }
        </div>
        <CollapsibleContent>
        <Card className="w-[100%]">
            <CardHeader>
              <CardDescription>
                Hi
              </CardDescription>
              <CardAction>
                <Dialog>
                 
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle></DialogTitle>
                      <DialogDescription>
                        
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </CardAction>
            </CardHeader>
            <CardContent>
            <Collapsible>
                <CollapsibleTrigger className="flex items-left justify-left gap-4 px-4"><h3>Hi</h3><HeightIcon style={{marginTop: '8px', cursor: 'pointer'}} /></CollapsibleTrigger>
                <CollapsibleContent>
                 Hi
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
            {/* <CardFooter>
              <p>Card Footer</p>
            </CardFooter> */}
          </Card>
        </CollapsibleContent>
      </Collapsible>
      <AggregatedTrades />
    </>
  );
}
