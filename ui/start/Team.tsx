import calebPhoto from './team/caleb.jpg?url'
import aidenPhoto from './team/aiden.jpg?url'
import ethanPhoto from './team/ethan.jpg?url'
import jamiePhoto from './team/jamie.jpg?url'
import kaipoPhoto from './team/kaipo.jpg?url'
import sarahPhoto from './team/sarah.jpg?url'

/** The team, shown on the start screen and the guided missions board. No photo → initials; no LinkedIn → plain name. */
const TEAM: { name: string; photo?: string; linkedin?: string }[] = [
  { name: 'Caleb Choi', photo: calebPhoto, linkedin: 'https://www.linkedin.com/in/caleb-choi-30a9943b0/' },
  { name: 'Aiden Sigurdson', photo: aidenPhoto, linkedin: 'https://www.linkedin.com/in/aiden-sigurdson/' },
  { name: 'Ethan Liu', photo: ethanPhoto, linkedin: 'https://www.linkedin.com/in/ethan-liu-999a4b336/' },
  { name: 'Jamie Huh', photo: jamiePhoto, linkedin: 'https://www.linkedin.com/in/jamie-huh-0b87a5302/' },
  { name: 'Kaipo Ojas', photo: kaipoPhoto, linkedin: 'https://www.linkedin.com/in/kaipo-ojas-995376319/' },
  { name: 'Sarah Youn', photo: sarahPhoto, linkedin: 'https://www.linkedin.com/in/sarahsyoun/' },
]
/** Six round headshots linking to LinkedIn. Styles: .ss-team in start.css. */
export function Team() {
  return <div className="ss-team">
    <p className="ss-hint">Six students at the University of Washington</p>
    <ul>
      {TEAM.map(member => {
        const face = member.photo
          ? <img src={member.photo} alt="" width={72} height={72} loading="lazy" />
          : <span className="ss-team-initials" aria-hidden="true">{member.name.split(' ').map(word => word[0]).join('')}</span>
        return <li key={member.name}>
          {member.linkedin
            ? <a href={member.linkedin} target="_blank" rel="noreferrer" aria-label={`${member.name} on LinkedIn`}>{face}<span>{member.name}</span></a>
            : <>{face}<span>{member.name}</span></>}
        </li>
      })}
    </ul>
  </div>
}
